const express = require("express");

function createUsersRouter({ db, logger }) {
  const router = express.Router();

  router.get("/users/profile", async (req, res, next) => {
    try {
      const result = await db.query(
        "SELECT id, name, email, avatar, phone, job_title, company, first_name, last_name, birth_date, gender, email_notifications, push_notifications FROM users WHERE id = $1",
        [req.user.id],
      );
      if (!result.rows[0]) return res.status(404).json({ error: "User not found" });
      return res.json(result.rows[0]);
    } catch (error) {
      logger.error("profile_fetch_failed", { requestId: req.requestId, userId: req.user.id, error: error.message });
      return next(error);
    }
  });

  router.put("/users/profile", async (req, res, next) => {
    try {
      const currentResult = await db.query(
        "SELECT name, avatar, phone, job_title, company, first_name, last_name, birth_date, gender, email_notifications, push_notifications FROM users WHERE id = $1",
        [req.user.id],
      );
      const current = currentResult.rows[0];
      if (!current) return res.status(404).json({ error: "User not found" });

      const text = (key, fallback) => req.body[key] === undefined ? fallback : String(req.body[key] || "").trim();
      const next = {
        name: text("name", current.name),
        avatar: text("avatar", current.avatar),
        phone: text("phone", current.phone),
        jobTitle: text("job_title", current.job_title),
        company: text("company", current.company),
        firstName: text("first_name", current.first_name),
        lastName: text("last_name", current.last_name),
        birthDate: req.body.birth_date === undefined ? current.birth_date : (req.body.birth_date || null),
        gender: req.body.gender === undefined ? current.gender : String(req.body.gender || "").trim() || null,
        emailNotifications: typeof req.body.email_notifications === "boolean" ? req.body.email_notifications : current.email_notifications,
        pushNotifications: typeof req.body.push_notifications === "boolean" ? req.body.push_notifications : current.push_notifications,
      };
      if (!next.name || next.name.length > 100) return res.status(400).json({ error: "Name must be between 1 and 100 characters" });
      if (next.avatar.length > 2048) return res.status(400).json({ error: "Avatar URL is too long" });
      if (next.phone.length > 50 || next.jobTitle.length > 100 || next.company.length > 100) {
        return res.status(400).json({ error: "Profile field is too long" });
      }

      const result = await db.query(
        `UPDATE users SET name=$1, avatar=$2, phone=$3, job_title=$4, company=$5,
          first_name=$6, last_name=$7, birth_date=$8, gender=$9,
          email_notifications=$10, push_notifications=$11 WHERE id=$12
          RETURNING id, name, email, avatar, phone, job_title, company, first_name, last_name, birth_date, gender, email_notifications, push_notifications`,
        [next.name, next.avatar, next.phone, next.jobTitle, next.company, next.firstName, next.lastName, next.birthDate, next.gender, next.emailNotifications, next.pushNotifications, req.user.id],
      );
      if (!result.rows[0]) return res.status(404).json({ error: "User not found or not updated" });
      return res.json(result.rows[0]);
    } catch (error) {
      logger.error("profile_update_failed", { requestId: req.requestId, userId: req.user.id, error: error.message });
      return next(error);
    }
  });

  return router;
}

module.exports = { createUsersRouter };
