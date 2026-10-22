ALTER TABLE "users" ADD COLUMN "email_domain_exception" INTEGER NOT NULL DEFAULT 0 CHECK (email_domain_exception IN (0,1));

-- Explicitly authorized, manually provisioned demo accounts. Other external
-- addresses must be authorized individually during Super Admin provisioning.
UPDATE "users" SET "email_domain_exception"=1
WHERE role='STUDENT'
 AND username IN ('charlesabacial','alberttorres','jerichogabriel','latchayhon','leivicente')
 AND lower(email)=lower(username)||'@yopmail.com';
