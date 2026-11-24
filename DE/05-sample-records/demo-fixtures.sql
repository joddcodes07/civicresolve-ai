-- Fictional data for local DE query demonstrations only.
-- Run only against civicresolve_de_test.

BEGIN;

INSERT INTO "Department" ("id", "name", "code") VALUES
('de_demo_pw', 'Demo Public Works', 'DEMO-PW'),
('de_demo_san', 'Demo Sanitation', 'DEMO-SAN');

INSERT INTO "Category" ("id", "name", "departmentId") VALUES
('ca_demo_road', 'Demo Road Repair', 'de_demo_pw'),
('ca_demo_waste', 'Demo Waste Management', 'de_demo_san');

INSERT INTO "Ward" ("id", "name", "lat", "lng") VALUES
('wa_demo_central', 'Demo Central Ward', 18.5204, 73.8567),
('wa_demo_north', 'Demo North Ward', 18.5300, 73.8600);

INSERT INTO "User" ("id", "name", "email", "role", "wardId") VALUES
('us_demo_asha', 'Asha Example', 'asha@example.test', 'CITIZEN', 'wa_demo_central'),
('us_demo_rahul', 'Rahul Example', 'rahul@example.test', 'CITIZEN', 'wa_demo_north'),
('us_demo_officer', 'Officer Example', 'officer@example.test', 'OFFICER', 'wa_demo_central');

INSERT INTO "Issue" ("id", "code", "lat", "lng", "reportCount", "updatedAt", "categoryId", "wardId") VALUES
('is_demo_open', 'DEMO-I-001', 18.5204, 73.8567, 3, now(), 'ca_demo_road', 'wa_demo_central'),
('is_demo_resolved', 'DEMO-I-002', 18.5300, 73.8600, 2, now(), 'ca_demo_road', 'wa_demo_north'),
('is_demo_lonely', 'DEMO-I-003', 18.5300, 73.8600, 1, now(), 'ca_demo_waste', 'wa_demo_north');

INSERT INTO "Complaint"
("id", "code", "originalText", "summary", "lat", "lng",
 "status", "slaHours", "dueAt", "updatedAt", "createdAt",
 "resolvedAt", "citizenId", "officerId", "categoryId",
 "departmentId", "wardId", "issueId")
VALUES
('co_demo_001', 'DEMO-C-001', 'Pothole near central park', 'Central road pothole',
 18.5204, 73.8567, 'SUBMITTED', 72, now() + interval '72 hours',
 now(), now() - interval '1 day', NULL,
 'us_demo_asha', NULL, 'ca_demo_road', 'de_demo_pw', 'wa_demo_central', 'is_demo_open'),

('co_demo_002', 'DEMO-C-002', 'Broken road near market', 'Market road damage',
 18.5204, 73.8567, 'ASSIGNED', 72, now() + interval '48 hours',
 now(), now() - interval '2 days', NULL,
 'us_demo_asha', 'us_demo_officer', 'ca_demo_road', 'de_demo_pw', 'wa_demo_central', 'is_demo_open'),

('co_demo_003', 'DEMO-C-003', 'Streetlight pole damaged', 'Damaged streetlight',
 18.5204, 73.8567, 'IN_PROGRESS', 72, now() + interval '24 hours',
 now(), now() - interval '3 days', NULL,
 'us_demo_rahul', 'us_demo_officer', 'ca_demo_road', 'de_demo_pw', 'wa_demo_central', 'is_demo_open'),

('co_demo_004', 'DEMO-C-004', 'Road resurfacing completed', 'Completed road repair',
 18.5300, 73.8600, 'RESOLVED', 72, now() - interval '2 days',
 now(), now() - interval '7 days', now() - interval '1 day',
 'us_demo_asha', 'us_demo_officer', 'ca_demo_road', 'de_demo_pw', 'wa_demo_north', 'is_demo_resolved'),

('co_demo_005', 'DEMO-C-005', 'Waste collection delayed', 'Delayed waste pickup',
 18.5300, 73.8600, 'NEEDS_REVIEW', 72, now() + interval '12 hours',
 now(), now() - interval '4 days', NULL,
 'us_demo_rahul', NULL, 'ca_demo_waste', 'de_demo_san', 'wa_demo_north', 'is_demo_lonely'),

('co_demo_006', 'DEMO-C-006', 'Road repair confirmed', 'Confirmed road repair',
 18.5300, 73.8600, 'CONFIRMED', 72, now() - interval '5 days',
 now(), now() - interval '10 days', now() - interval '6 days',
 'us_demo_asha', 'us_demo_officer', 'ca_demo_road', 'de_demo_pw', 'wa_demo_north', 'is_demo_resolved');

INSERT INTO "StatusHistory"
("id", "complaintId", "fromStatus", "toStatus", "note")
VALUES
('sh_demo_001', 'co_demo_001', NULL, 'SUBMITTED', 'Fictional initial submission'),
('sh_demo_002', 'co_demo_002', 'SUBMITTED', 'ASSIGNED', 'Fictional assignment'),
('sh_demo_003', 'co_demo_003', 'ASSIGNED', 'IN_PROGRESS', 'Fictional work started'),
('sh_demo_004', 'co_demo_004', 'IN_PROGRESS', 'RESOLVED', 'Fictional repair completed'),
('sh_demo_005', 'co_demo_006', 'RESOLVED', 'CONFIRMED', 'Fictional resolution confirmed');

INSERT INTO "Transfer"
("id", "complaintId", "fromDeptId", "toDeptId", "reason")
VALUES
('tr_demo_001', 'co_demo_003', 'de_demo_san', 'de_demo_pw', 'Fictional routing back to Public Works');

INSERT INTO "Message"
("id", "complaintId", "senderRole", "senderName", "body")
VALUES
('me_demo_001', 'co_demo_001', 'CITIZEN', 'Asha Example', 'Fictional complaint message'),
('me_demo_002', 'co_demo_004', 'OFFICER', 'Officer Example', 'Fictional resolution update');

INSERT INTO "Feedback"
("id", "complaintId", "confirmed", "rating", "comment")
VALUES
('fb_demo_001', 'co_demo_004', true, 5, 'Fictional positive feedback');

COMMIT;
