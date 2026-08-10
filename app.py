# name=app.py
from flask import Flask, render_template, request, redirect, url_for, session, flash, abort
from flask_sqlalchemy import SQLAlchemy
from faker import Faker
from datetime import datetime
import os

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET", "dev-secret")
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///data.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "adminpw")

db = SQLAlchemy(app)
fake = Faker("en_US")

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120))
    age = db.Column(db.Integer)
    city = db.Column(db.String(120))
    bio = db.Column(db.Text)
    email = db.Column(db.String(200))
    phone = db.Column(db.String(100))
    is_admin = db.Column(db.Boolean, default=False)

class Like(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    liker_id = db.Column(db.Integer, db.ForeignKey("user.id"), index=True)
    liked_id = db.Column(db.Integer, db.ForeignKey("user.id"), index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Match(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_a = db.Column(db.Integer, db.ForeignKey("user.id"), index=True)
    user_b = db.Column(db.Integer, db.ForeignKey("user.id"), index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Ticket(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    requester_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    target_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    status = db.Column(db.String(20), default="pending")  # pending, approved, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    handled_at = db.Column(db.DateTime, nullable=True)
    handled_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)

# Utilities
def current_user():
    uid = session.get("user_id")
    if not uid:
        return None
    return User.query.get(uid)

def ensure_db_seeded():
    if User.query.count() >= 1000:
        return
    # create admin
    admin = User(name="SiteAdmin", age=30, city="AdminCity", bio="Administrator", email="admin@example.com", phone="000-000-0000", is_admin=True)
    db.session.add(admin)
    # create fake users
    users_to_create = 1000
    for _ in range(users_to_create):
        user = User(
            name=fake.name(),
            age=fake.random_int(18, 60),
            city=fake.city(),
            bio=fake.sentence(nb_words=12),
            email=fake.unique.email(),
            phone=fake.phone_number()
        )
        db.session.add(user)
    db.session.commit()
    print("Seeded DB with users")

def is_matched(a, b):
    a_id, b_id = int(a), int(b)
    if Match.query.filter_by(user_a=min(a_id,b_id), user_b=max(a_id,b_id)).first():
        return True
    return False

def create_match_if_needed(a, b):
    # a liked b and b liked a?
    like_ab = Like.query.filter_by(liker_id=a, liked_id=b).first()
    like_ba = Like.query.filter_by(liker_id=b, liked_id=a).first()
    if like_ab and like_ba and not is_matched(a,b):
        m = Match(user_a=min(a,b), user_b=max(a,b))
        db.session.add(m)
        db.session.commit()
        return True
    return False

# Routes
@app.route("/")
def index():
    if not current_user():
        return redirect(url_for("login"))
    return redirect(url_for("profiles"))

@app.route("/login", methods=["GET","POST"])
def login():
    if request.method == "POST":
        uid = request.form.get("user_id")
        if not uid:
            flash("请输入用户 ID 或选择用户")
            return redirect(url_for("login"))
        user = User.query.get(int(uid))
        if not user:
            flash("未找到用户")
            return redirect(url_for("login"))
        session["user_id"] = user.id
        flash(f"以 {user.name} 登录")
        return redirect(url_for("profiles"))
    # show sample users for login (first 50)
    users = User.query.limit(50).all()
    return render_template("login.html", users=users)

@app.route("/logout")
def logout():
    session.pop("user_id", None)
    flash("已退出登录")
    return redirect(url_for("login"))

@app.route("/profiles")
def profiles():
    user = current_user()
    if not user:
        return redirect(url_for("login"))
    q = request.args.get("q", "").strip()
    page = int(request.args.get("page", 1))
    per = 20
    query = User.query.filter(User.id != user.id)
    if q:
        query = query.filter(User.name.ilike(f"%{q}%") | User.city.ilike(f"%{q}%"))
    total = query.count()
    users = query.offset((page-1)*per).limit(per).all()
    # preload likes to indicate whether current_user liked them and whether mutual matched
    liked_ids = {l.liked_id for l in Like.query.filter_by(liker_id=user.id).all()}
    matches = set()
    for m in Match.query.filter((Match.user_a==user.id) | (Match.user_b==user.id)).all():
        matches.add(m.user_a if m.user_b==user.id else m.user_b)
    return render_template("profiles.html", users=users, liked_ids=liked_ids, matches=matches, page=page, per=per, total=total, q=q)

@app.route("/profile/<int:uid>")
def profile(uid):
    me = current_user()
    if not me:
        return redirect(url_for("login"))
    target = User.query.get_or_404(uid)
    liked = Like.query.filter_by(liker_id=me.id, liked_id=target.id).first() is not None
    matched = is_matched(me.id, target.id)
    # check if a ticket exists
    ticket = Ticket.query.filter_by(requester_id=me.id, target_id=target.id).first()
    return render_template("profile.html", target=target, liked=liked, matched=matched, ticket=ticket)

@app.route("/like/<int:uid>", methods=["POST"])
def like(uid):
    me = current_user()
    if not me:
        return redirect(url_for("login"))
    if me.id == uid:
        abort(400)
    existing = Like.query.filter_by(liker_id=me.id, liked_id=uid).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        flash("已取消喜欢")
    else:
        l = Like(liker_id=me.id, liked_id=uid)
        db.session.add(l)
        db.session.commit()
        created_match = create_match_if_needed(me.id, uid)
        if created_match:
            flash("恭喜！你们互相喜欢，已匹配 🎉")
        else:
            flash("已喜欢")
    return redirect(request.referrer or url_for("profiles"))

@app.route("/request_contact/<int:uid>", methods=["POST"])
def request_contact(uid):
    me = current_user()
    if not me:
        return redirect(url_for("login"))
    if not is_matched(me.id, uid):
        flash("只能在匹配后申请联系方式。")
        return redirect(url_for("profile", uid=uid))
    existing = Ticket.query.filter_by(requester_id=me.id, target_id=uid).first()
    if existing:
        flash("你已提交过工单，等待客服处理。")
        return redirect(url_for("my_tickets"))
    t = Ticket(requester_id=me.id, target_id=uid, status="pending")
    db.session.add(t)
    db.session.commit()
    flash("已提交客服工单，等待处理。")
    return redirect(url_for("my_tickets"))

@app.route("/my_tickets")
def my_tickets():
    me = current_user()
    if not me:
        return redirect(url_for("login"))
    tickets = Ticket.query.filter_by(requester_id=me.id).order_by(Ticket.created_at.desc()).all()
    return render_template("my_tickets.html", tickets=tickets)

# Admin
def check_admin():
    me = current_user()
    if me and me.is_admin:
        return True
    # also support simple password param for quick admin access (not secure)
    pw = request.args.get("pw")
    if pw and pw == ADMIN_PASSWORD:
        return True
    return False

@app.route("/admin")
def admin_index():
    if not check_admin():
        return "请使用管理员账号或通过 ?pw=ADMIN_PASSWORD 访问", 403
    tickets = Ticket.query.order_by(Ticket.created_at.desc()).all()
    return render_template("admin.html", tickets=tickets)

@app.route("/admin/handle/<int:ticket_id>", methods=["POST"])
def admin_handle(ticket_id):
    if not check_admin():
        return "无权限", 403
    action = request.form.get("action")
    ticket = Ticket.query.get_or_404(ticket_id)
    if action == "approve":
        ticket.status = "approved"
        ticket.handled_at = datetime.utcnow()
        ticket.handled_by = current_user().id if current_user() else None
        db.session.commit()
        flash("已批准并可向请求者公开联系方式")
    elif action == "reject":
        ticket.status = "rejected"
        ticket.handled_at = datetime.utcnow()
        ticket.handled_by = current_user().id if current_user() else None
        db.session.commit()
        flash("已拒绝")
    return redirect(url_for("admin_index"))

@app.route("/ticket/<int:ticket_id>")
def view_ticket(ticket_id):
    me = current_user()
    if not me:
        return redirect(url_for("login"))
    t = Ticket.query.get_or_404(ticket_id)
    # only requester or admin can view
    if t.requester_id != me.id and not check_admin():
        return "无权限查看此工单", 403
    target = User.query.get(t.target_id)
    return render_template("ticket.html", ticket=t, target=target)

# Initialize DB and seed on first run
with app.app_context():
    db.create_all()
    ensure_db_seeded()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
