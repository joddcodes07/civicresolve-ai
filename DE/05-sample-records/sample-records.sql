-- Fictional demo records only. Run only on a verified disposable test DB.
-- Transaction intentionally rolls back.
BEGIN;
INSERT INTO "Department" ("id", "name", "code") VALUES ('de_demo_publicworks', 'Demo Public Works', 'DEMO-PW');
INSERT INTO "Category" ("id", "name", "departmentId") VALUES ('ca_demo_road', 'Demo Road Surface', 'de_demo_publicworks');
INSERT INTO "Ward" ("id", "name", "lat", "lng") VALUES ('wa_demo_central', 'Demo Central Ward', 18.5204, 73.8567);
INSERT INTO "User" ("id", "name", "email", "role", "wardId") VALUES ('us_demo_citizen', 'Asha Example', 'asha@example.test', 'CITIZEN', 'wa_demo_central');
INSERT INTO "Issue" ("id", "code", "lat", "lng", "categoryId", "wardId") VALUES ('is_demo_pothole', 'DEMO-ISSUE-001', 18.5204, 73.8567, 'ca_demo_road', 'wa_demo_central');
INSERT INTO "Complaint" ("id", "code", "originalText", "summary", "lat", "lng", "slaHours", "dueAt", "citizenId", "categoryId", "departmentId", "wardId", "issueId") VALUES ('co_demo_pothole', 'DEMO-C-001', 'Fictional pothole near Demo Central Park.', 'Fictional road surface issue', 18.5204, 73.8567, 72, now() + interval '72 hours', 'us_demo_citizen', 'ca_demo_road', 'de_demo_publicworks', 'wa_demo_central', 'is_demo_pothole');
INSERT INTO "StatusHistory" ("id", "complaintId", "fromStatus", "toStatus", "note") VALUES ('sh_demo_created', 'co_demo_pothole', NULL, 'SUBMITTED', 'Fictional demonstration history');
INSERT INTO "Message" ("id", "complaintId", "senderRole", "senderName", "body") VALUES ('me_demo_note', 'co_demo_pothole', 'CITIZEN', 'Asha Example', 'Fictional demonstration message');
INSERT INTO "Feedback" ("id", "complaintId", "confirmed", "rating", "comment") VALUES ('fb_demo_feedback', 'co_demo_pothole', false, 4, 'Fictional demonstration feedback');
ROLLBACK;
