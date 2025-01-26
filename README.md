# Vector-projects
# Waada-POC

## Table of Contents
- [Clone the Repository](#clone-the-repository)
- [Setup and Run the Project](#setup-and-run-the-project)
  - [Step 1: Navigate to the Project Directory](#step-1-navigate-to-the-project-directory)
  - [Step 2: Create and Activate a Python Virtual Environment](#step-2-create-and-activate-a-python-virtual-environment)
  - [Step 3: Install Node.js Dependencies and Start the Development Server](#step-3-install-nodejs-dependencies-and-start-the-development-server)
  - [Step 4: Open Another Terminal and Activate the Virtual Environment](#step-4-open-another-terminal-and-activate-the-virtual-environment)
  - [Step 5: Install Python Dependencies and Run the Server](#step-5-install-python-dependencies-and-run-the-server)

---

## Clone the Repository

```bash
git clone https://github.com/masab009/Waada-POC.git
```

---

## Setup and Run the Project

### Step 1: Navigate to the Project Directory

```bash
cd Waada-POC
```

### Step 2: Create and Activate a Python Virtual Environment

```bash
python -m venv venv
source venv/bin/activate
```

### Step 3: Install Node.js Dependencies and Start the Development Server

```bash
npm install && npm run dev
```

### Step 4: Open Another Terminal and Activate the Virtual Environment

In a **new terminal tab/window** (same directory):

```bash
source venv/bin/activate
```

### Step 5: Install Python Dependencies and Run the Server

```bash
pip install -r requirements.txt
python server.py
```

---

## Notes
- Ensure Python, Node.js, and npm are installed.
- Add `venv/` to `.gitignore` to exclude the virtual environment.
