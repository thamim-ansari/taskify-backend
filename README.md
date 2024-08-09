# Taskify (Task Manager API)

## Overview

The Task Manager API is a RESTful service designed for managing users, projects, and tasks. It provides functionality for user authentication, project creation, task management, and more. This API uses SQLite as the database and is built using Node.js with Express.

## Features

- **User Authentication**: Sign up, log in, and manage user profiles.
- **Projects Management**: Create, update, delete, and list projects.
- **Tasks Management**: Create, update, delete, and list tasks.
- **Search Functionality**: Search for projects and tasks by title.

## Technologies Used

- Node.js
- Express
- SQLite
- JWT (JSON Web Token) for authentication
- bcrypt for password hashing
- cors for cross-origin requests

## Setup and Installation

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later) or Yarn

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/thamim-ansari/taskify-backend.git
   cd taskify-backend
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up the SQLite database**:

   Ensure you have an SQLite database named `TaskManager.db` in the root directory of the project. You can use SQLite tools to create and populate the database according to the provided schema.

4. **Start the server**:

   ```bash
   npm start
   ```

   The server will start on `http://localhost:3001`.

## Database Schema

### Users Table

- **Table Name**: `users`
- **Description**: Stores user details.
- **Columns**:
  - `user_id` (INTEGER, Primary Key): Unique identifier for each user.
  - `first_name` (TEXT): User's first name.
  - `last_name` (TEXT): User's last name.
  - `role` (TEXT): User's role (e.g., admin, user).
  - `email_id` (TEXT, Unique): User's email address.
  - `password` (TEXT): User's hashed password.

### Projects Table

- **Table Name**: `projects`
- **Description**: Stores project details.
- **Columns**:
  - `project_id` (INTEGER, Primary Key): Unique identifier for each project.
  - `project_title` (TEXT): Title of the project.
  - `project_description` (TEXT): Description of the project.
  - `user_id` (INTEGER, Foreign Key): References `user_id` in the `users` table.

### Tasks Table

- **Table Name**: `tasks`
- **Description**: Stores task details.
- **Columns**:
  - `task_id` (INTEGER, Primary Key): Unique identifier for each task.
  - `task_title` (TEXT): Title of the task.
  - `task_description` (TEXT): Description of the task.
  - `task_status` (TEXT): Status of the task (e.g., pending, completed).
  - `user_id` (INTEGER, Foreign Key): References `user_id` in the `users` table.
  - `project_id` (INTEGER, Foreign Key): References `project_id` in the `projects` table.

### Relationships

- **Users and Projects**: Each project is associated with a user. The `user_id` in the `projects` table is a foreign key that references the `user_id` in the `users` table. This establishes a one-to-many relationship between users and projects (one user can have multiple projects).

- **Projects and Tasks**: Each task is associated with a project. The `project_id` in the `tasks` table is a foreign key that references the `project_id` in the `projects` table. This establishes a one-to-many relationship between projects and tasks (one project can have multiple tasks).

- **Users and Tasks**: Each task is assigned to a user. The `user_id` in the `tasks` table is a foreign key that references the `user_id` in the `users` table. This establishes a many-to-one relationship between tasks and users (multiple tasks can be assigned to one user).

## API Endpoints

### User Routes

- **Sign Up**

  - `POST /signup/`
  - Request body: `{ firstName, lastName, role, email, password }`
  - Response: `{ message: "Signed up successfully" }` or `{ message: "Email already exists" }`

- **Log In**

  - `POST /login/`
  - Request body: `{ email, password }`
  - Response: `{ jwtToken }` or `{ message: "Invalid email" }` / `{ message: "Invalid password" }`

- **Get User Profile**
  - `GET /profile/`
  - Headers: `{ Authorization: "Bearer <jwtToken>" }`
  - Response: `{ user_id, first_name, last_name, role, email_id, password }`

### Project Routes

- **Create Project**

  - `POST /projects/`
  - Request body: `{ projectTitle, projectDescription, userId }`
  - Response: `{ message: "Project created successfully" }` or `{ message: "Project already exists" }`

- **Get All Projects**

  - `GET /projects/`
  - Query parameters: `search_q`
  - Response: Array of project objects

- **Update Project**

  - `PUT /projects/:projectId`
  - Request body: `{ updatedProjectTitle, updatedProjectDescription }`
  - Response: `{ message: "Project updated successfully" }` or `{ message: "Project not found" }`

- **Delete Project**
  - `DELETE /projects/:id`
  - Response: `{ message: "Project deleted successfully" }` or `{ message: "Invalid project id" }`

### Task Routes

- **Create Task**

  - `POST /tasks/`
  - Request body: `{ taskTitle, taskDescription, taskStatus, projectId, taskUserId }`
  - Response: `{ message: "Task created successfully" }`

- **Get All Tasks**

  - `GET /tasks/`
  - Query parameters: `search_q`
  - Response: Array of task objects

- **Update Task**

  - `PUT /tasks/:taskId`
  - Request body: `{ updatedTaskTitle, updatedTaskDescription, taskStatus }`
  - Response: `{ message: "Task updated successfully" }` or `{ message: "Task not found" }`

- **Delete Task**
  - `DELETE /tasks/:taskId`
  - Response: `{ message: "Task deleted successfully" }` or `{ message: "Invalid task id" }`

## Authentication

To access protected routes, include a JWT token in the `Authorization` header of your requests:
