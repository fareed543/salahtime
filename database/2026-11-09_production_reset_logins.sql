-- ================================================================================================
-- SalahTime — PRODUCTION: sign every user out once (security fix 2026-11-09)
-- ================================================================================================
-- Why: until the NF-012 API deploy, http-ramadan/customer-search returned every user's login token
-- (authKey) without login. New random tokens make any copied token useless.
-- See WorkStation/Feedbacks/FEEDBACK_2026-11-09_program-api-open-endpoints.md.
--
-- WHEN:  only AFTER the new API is deployed (before that, new tokens could be read again).
-- EFFECT: every user (app, website, back office) must sign in again once. Nothing else changes.
-- HOW:   phpMyAdmin > click the PRODUCTION database > SQL tab > paste > Go.
-- ================================================================================================

SELECT DATABASE() AS current_database, COUNT(*) AS users FROM bt_customer;

UPDATE `bt_customer`
SET `authKey` = SHA2(CONCAT(UUID(), '-', `id`, '-', RAND()), 256);

-- Check: every token is new and unique (expect users = distinct_tokens).
SELECT COUNT(*) AS users, COUNT(DISTINCT `authKey`) AS distinct_tokens FROM `bt_customer`;
