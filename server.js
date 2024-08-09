const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
const cors = require("cors");

// Middleware for CORS
app.use(cors());
// Middleware to parse JSON bodies
app.use(express.json());

// Path to the SQLite database
const dbPath = path.join(__dirname, "TaskManager.db");

let db = null;

const PORT = 3001;

// Initialize database connection and start the server
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(PORT, () => {
      console.log(`Server Running at http://localhost:${PORT}/`);
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// Route to handle user signup
app.post("/signup/", async (request, response) => {
  try {
    const { firstName, lastName, role, email, password } = request.body;

    // Hash the user's password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if the email already exists in the database
    const isEmailExistsQuery = `SELECT * FROM users WHERE email_id = ?`;
    const isEmailExistData = await db.get(isEmailExistsQuery, [email]);

    if (isEmailExistData) {
      return response.status(400).json({ message: "Email already exists" });
    } else {
      // Insert new user data into the database
      const insertUserDataQuery = `
        INSERT INTO users (first_name, last_name, role, email_id, password)
        VALUES (?, ?, ?, ?, ?)
      `;
      await db.run(insertUserDataQuery, [
        firstName,
        lastName,
        role,
        email,
        hashedPassword,
      ]);
      response.status(200).json({ message: "Signed up successfully" });
    }
  } catch (error) {
    console.error("Error:", error);
    response.status(500).json({ message: "Internal server error" });
  }
});

// Route to handle user login
app.post("/login/", async (request, response) => {
  const { email, password } = request.body;

  // Check if the user exists in the database
  const selectUserQuery = `SELECT * FROM users WHERE email_id = ?`;
  const dbUser = await db.get(selectUserQuery, [email]);

  if (dbUser === undefined) {
    response.status(400).json({ message: "Invalid email" });
  } else {
    // Compare the provided password with the hashed password
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);

    if (isPasswordMatched === true) {
      // Generate a JWT token
      const payload = {
        email_id: email,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400).json({ message: "Invalid password" });
    }
  }
});

// Middleware to authenticate JWT tokens
const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }

  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    // Verify the JWT token
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.email = payload.email_id;
        next();
      }
    });
  }
};

// Route to get user profile details
app.get("/profile/", authenticateToken, async (request, response) => {
  let { email } = request;

  // Fetch user details from the database
  const selectUserQuery = `SELECT * FROM users WHERE email_id = '${email}'`;
  const userDetails = await db.get(selectUserQuery);

  response.status(200).send(userDetails);
});

// Route to create a new project
app.post("/projects/", authenticateToken, async (request, response) => {
  try {
    const { projectTitle, projectDescription, userId } = request.body;

    // Check if the project already exists
    const isProjectExistsQuery = `SELECT * FROM projects WHERE project_title = ?`;
    const isProjectExists = await db.get(isProjectExistsQuery, [projectTitle]);

    if (isProjectExists) {
      return response.status(400).json({ message: "Project already exists" });
    } else {
      // Insert new project data into the database
      const insertProjectQuery = `INSERT INTO projects (project_title, project_description, user_id)
        VALUES (?, ?, ?)`;
      await db.run(insertProjectQuery, [
        projectTitle,
        projectDescription,
        userId,
      ]);
      response.status(201).json({ message: "Project created successfully" });
    }
  } catch (error) {
    console.error("Error:", error);
    response.status(500).json({ message: "Internal server error" });
  }
});

// Route to get all projects with optional search query
app.get("/projects/", authenticateToken, async (request, response) => {
  try {
    const { search_q = "" } = request.query;

    // Fetch all projects with optional search filter
    const getAllProjectsQuery = ` SELECT 
        projects.project_id, 
        projects.project_title, 
        projects.project_description, 
        users.user_id, 
        users.first_name, 
        users.last_name, 
        users.role, 
        users.email_id
      FROM projects
      JOIN users ON projects.user_id = users.user_id
      WHERE project_title LIKE ?
      ORDER BY project_id DESC`;
    const allProjectData = await db.all(getAllProjectsQuery, [`%${search_q}%`]);
    response.status(200).json(allProjectData);
  } catch (error) {
    console.error("Error:", error);
    response.status(500).json({ message: "Internal server error" });
  }
});

// Route to update project details
app.put(
  "/projects/:projectId",
  authenticateToken,
  async (request, response) => {
    const { projectId } = request.params;
    const { updatedProjectTitle, updatedProjectDescription } = request.body;

    if (!updatedProjectTitle || !updatedProjectDescription) {
      return response.status(400).json({ message: "Missing required fields" });
    }

    try {
      // Update project details in the database
      const updateProjectQuery = `
      UPDATE projects
      SET project_title = ?,
          project_description = ?
      WHERE project_id = ?`;
      const result = await db.run(updateProjectQuery, [
        updatedProjectTitle,
        updatedProjectDescription,
        projectId,
      ]);
      if (result.changes === 0) {
        return response.status(404).json({ message: "Project not found" });
      }
      response.status(200).json({ message: "Project updated successfully" });
    } catch (error) {
      console.error("Error:", error);
      response.status(500).json({ message: "Internal server error" });
    }
  }
);

// Route to delete a project
app.delete("/projects/:id", authenticateToken, async (request, response) => {
  try {
    const { id } = request.params;

    // Check if the project exists
    const getProjectQuery = `SELECT * FROM projects WHERE project_id = ?`;
    const isProjectAvailable = await db.get(getProjectQuery, [id]);
    if (!isProjectAvailable) {
      return response.status(404).json({ message: "Invalid project id" });
    } else {
      // Delete the project from the database
      const deleteProjectQuery = `DELETE FROM projects WHERE project_id = ?`;
      await db.run(deleteProjectQuery, [id]);
      response.status(200).json({ message: "Project deleted successfully" });
    }
  } catch (error) {
    console.error("Error:", error);
    response.status(500).json({ message: "Internal server error" });
  }
});

// Route to create a new task
app.post("/tasks/", authenticateToken, async (request, response) => {
  try {
    const {
      taskTitle,
      taskDescription,
      taskStatus,
      projectId,
      taskUserId,
    } = request.body;

    // Insert new task data into the database
    const insertTaskQuery = `INSERT INTO tasks (task_title, task_description, task_status, project_id, user_id)
        VALUES (?, ?, ?, ?, ?)`;
    await db.run(insertTaskQuery, [
      taskTitle,
      taskDescription,
      taskStatus,
      projectId,
      taskUserId,
    ]);
    response.status(201).json({ message: "Task created successfully" });
  } catch (error) {
    console.error("Error:", error);
    response.status(500).json({ message: "Internal server error" });
  }
});

// Route to get all tasks with optional search query
app.get("/tasks/", authenticateToken, async (request, response) => {
  try {
    const { search_q = "" } = request.query;

    // Fetch all tasks with optional search filter
    const getAllTasksQuery = ` SELECT 
        tasks.task_id, 
        tasks.task_title, 
        tasks.task_description, 
        tasks.task_status,
        users.user_id, 
        users.first_name, 
        users.last_name, 
        users.role, 
        users.email_id,
        projects.project_id,
        projects.project_title
      FROM tasks
      JOIN users ON tasks.user_id = users.user_id
      JOIN projects ON tasks.project_id = projects.project_id
      WHERE task_title LIKE ?
      ORDER BY task_id DESC`;
    const allTaskData = await db.all(getAllTasksQuery, [`%${search_q}%`]);
    response.status(200).json(allTaskData);
  } catch (error) {
    console.error("Error:", error);
    response.status(500).json({ message: "Internal server error" });
  }
});

// Route to update task details
app.put("/tasks/:taskId", authenticateToken, async (request, response) => {
  const { taskId } = request.params;
  const { taskStatus, updatedTaskDescription, updatedTaskTitle } = request.body;

  if (!updatedTaskTitle || !updatedTaskDescription || !taskStatus) {
    return response.status(400).json({ message: "Missing required fields" });
  }

  try {
    // Update task details in the database
    const updateTaskQuery = `
      UPDATE tasks
      SET task_title = ?,
          task_description = ?,
          task_status = ?
      WHERE task_id = ?`;
    const result = await db.run(updateTaskQuery, [
      updatedTaskTitle,
      updatedTaskDescription,
      taskStatus,
      taskId,
    ]);
    if (result.changes === 0) {
      return response.status(404).json({ message: "Task not found" });
    }
    response.status(200).json({ message: "Task updated successfully" });
  } catch (error) {
    console.error("Error:", error);
    response.status(500).json({ message: "Internal server error" });
  }
});

// Route to delete a task
app.delete("/tasks/:taskId", authenticateToken, async (request, response) => {
  try {
    const { taskId } = request.params;

    // Check if the task exists
    const getTaskQuery = `SELECT * FROM tasks WHERE task_id = ?`;
    const isTaskAvailable = await db.get(getTaskQuery, [taskId]);
    if (!isTaskAvailable) {
      return response.status(404).json({ message: "Invalid task id" });
    } else {
      // Delete the task from the database
      const deleteTaskQuery = `DELETE FROM tasks WHERE task_id = ?`;
      await db.run(deleteTaskQuery, [taskId]);
      response.status(200).json({ message: "Task deleted successfully" });
    }
  } catch (error) {
    console.error("Error:", error);
    response.status(500).json({ message: "Internal server error" });
  }
});
