"""HTTP acceptance checks against an isolated PostgreSQL-backed local app."""
import json
import os
from http import cookiejar
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone, timedelta
from uuid import uuid4

BASE = os.environ.get("PRACTISYNC_BASE_URL", "http://localhost:3000")


def client():
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookiejar.CookieJar()))


def request(opener, path, payload=None, form=False):
    headers = {"Origin": BASE}
    body = None
    if payload is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded" if form else "application/json"
        body = urllib.parse.urlencode(payload).encode() if form else json.dumps(payload).encode()
    if form:
        headers["X-Auth-Return-Redirect"] = "1"
    req = urllib.request.Request(BASE + path, data=body, headers=headers)
    try:
        with opener.open(req, timeout=15) as response:
            raw = response.read()
            return response.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        raw = error.read()
        return error.code, json.loads(raw) if raw else None


def sign_in(demo_id=None, username=None, password=None):
    opener = client()
    status, csrf = request(opener, "/api/auth/csrf")
    assert status == 200, (status, csrf)
    values = {"csrfToken": csrf["csrfToken"], "callbackUrl": BASE + "/"}
    if demo_id:
        values["demoId"] = demo_id
    else:
        values.update(username=username, password=password)
    status, result = request(opener, "/api/auth/callback/credentials", values, form=True)
    assert status == 200 and "error=" not in result.get("url", ""), (status, result)
    return opener


def action(opener, name, values, expected=200):
    status, result = request(opener, "/api/action", {"action": name, "values": values})
    assert status == expected, (name, status, result)
    return result


def snapshot(opener):
    status, result = request(opener, "/api/data")
    assert status == 200, (status, result)
    return result


status, config = request(client(), "/api/config")
assert status == 200 and config["demo"] and config["authConfigured"], config
assert request(client(), "/api/data")[0] == 401

student = sign_in(demo_id="demo-student")
coordinator = sign_in(demo_id="demo-coordinator")
admin = sign_in(demo_id="demo-admin")
student_data = snapshot(student)
coordinator_data = snapshot(coordinator)
admin_data = snapshot(admin)
assert student_data["user"]["role"] == "STUDENT"
assert coordinator_data["user"]["role"] == "COORDINATOR"
assert admin_data["user"]["role"] == "SUPER_ADMIN"
assert len(student_data["placements"]) == 1
assert admin_data["incidents"] == []
assert "passwordHash" not in student_data["user"]
print("PostgreSQL demo sign-ins and scoped reads passed.", flush=True)

# DTR creation/correction; daily confirmation must remain retired.
work_date = (datetime.now(timezone(timedelta(hours=8))).date() - timedelta(days=1)).isoformat()
# Evening intervals avoid the seed's 08:00–17:00 records, including repeated checks.
intervals = [(datetime.fromisoformat(row["startsAt"].replace("Z","+00:00")), datetime.fromisoformat(row["endsAt"].replace("Z","+00:00"))) for row in student_data["entries"]]
start_hour = next(hour for hour in range(18,23) if not any(a < datetime.fromisoformat(f"{work_date}T{hour+1:02d}:00+08:00") and b > datetime.fromisoformat(f"{work_date}T{hour:02d}:00+08:00") for a,b in intervals))
dtr = action(student, "dtr", {
    "placementId": "placement-1", "date": work_date,
    "startsAt": f"{work_date}T{start_hour:02d}:00", "endsAt": f"{work_date}T{start_hour+1:02d}:00",
    "breakMinutes": 0, "narrative": "Synthetic PostgreSQL smoke record.",
})
action(coordinator, "confirm", {"entryId": dtr["id"], "version": 1}, expected=409)
action(student, "dtr", {
    "placementId": "placement-1", "entryId": dtr["id"], "version": 1,
    "date": work_date, "startsAt": f"{work_date}T{start_hour:02d}:00", "endsAt": f"{work_date}T{start_hour:02d}:45",
    "breakMinutes": 0, "narrative": "Corrected synthetic PostgreSQL smoke record.",
    "reason": "Corrected the recorded time-out.",
})
current_entry = next(row for row in snapshot(student)["entries"] if row["id"] == dtr["id"])
assert current_entry["version"] == 2 and current_entry["confirmedVersion"] is None
print("PostgreSQL DTR correction and retired-confirmation denial passed.", flush=True)

# Coordinator class creation, immediate student registration, and notification read.
smoke_suffix = uuid4().hex[:8]
smoke_username = f"smoke.{smoke_suffix}"
new_account = action(admin, "account", {
    "name": "Riley Synthetic", "username": smoke_username,
    "email": f"{smoke_username}@rtu.edu.ph", "role": "STUDENT",
    "courseId": "course-it", "password": "Smoke@Test2026!",
})
created_class = action(coordinator, "class", {
    "name": "Smoke Practicum", "section": f"BSIT {smoke_suffix}", "courseId": "course-it",
})
class_row = next(row for row in snapshot(coordinator)["classes"] if row["id"] == created_class["id"])
new_student = sign_in(username=smoke_username, password="Smoke@Test2026!")
assert request(new_student,"/api/data")[0] == 403
status, result = request(new_student, "/api/student-verification", {"legalName":"Riley Synthetic","studentNumber":"SMOKE-"+smoke_suffix,"yearLevel":4,"classCode":class_row["codeLabel"],"version":1})
assert status == 200, (status,result)
new_student_data = snapshot(new_student)
assert any(row["id"] == created_class["id"] for row in new_student_data["classes"])
action(coordinator,"announcement",{"classId":created_class["id"],"title":"Fictional smoke notice","body":"A notification read check for the synthetic class."})
approval_notification = next(row for row in snapshot(new_student)["notifications"] if row["resourceType"] == "announcement")
action(new_student, "markNotificationRead", {"notificationId": approval_notification["id"]})
assert next(row for row in snapshot(new_student)["notifications"] if row["id"] == approval_notification["id"])["readAt"]
print("PostgreSQL class enrollment and notification read passed.", flush=True)

# Policy versioning, application eligibility, and coordinator-routed SOS privacy.
current_policy = max((row for row in coordinator_data["policies"] if row["courseId"] == "course-it"), key=lambda row: row["version"])
action(coordinator, "policy", {"courseId": "course-it", "hours": 490, "version": current_policy["version"]})
action(new_student, "application", {"jobId": "job-1", "coverLetter": "Fictional PostgreSQL smoke application."})
case = action(student, "incident", {
    "placementId": "placement-1", "subject": "Synthetic smoke case",
    "narrative": "Fictional test text only.",
})
assert any(row["id"] == case["id"] for row in snapshot(coordinator)["incidents"])
assert all(row["id"] != case["id"] for row in snapshot(admin)["incidents"])
print("PostgreSQL policy, application, and coordinator SOS privacy passed.", flush=True)

# Account changes increment the session version, invalidating the existing JWT.
action(admin, "role", {"userId": new_account["id"], "role": "STUDENT", "status": "DISABLED"})
print("Account disabled; checking the old session now.", flush=True)
assert request(new_student, "/api/data")[0] == 401

action(coordinator, "revokeOwnSessions", {"userId": admin_data["user"]["id"]})
assert request(coordinator, "/api/data")[0] == 401
assert request(admin, "/api/data")[0] == 200
print("Self-session revocation and unchanged admin access passed.", flush=True)

print("PostgreSQL HTTP smoke passed: three demo sign-ins, password login, scoped reads, DTR correction and daily-confirmation denial, class enrollment, policy update, application, notification, coordinator SOS privacy, and session revocation.")
