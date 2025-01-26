# Makefile for Waada-POC

VENV_PATH = venv
PYTHON = $(VENV_PATH)/bin/python
SHELL = /bin/bash

.PHONY: help venv install frontend backend run clean

help:
	@echo "Available targets:"
	@echo "  venv     Create Python virtual environment"
	@echo "  install  Install all dependencies (Python + Node.js)"
	@echo "  frontend Start Node.js development server"
	@echo "  backend  Start Python backend server"
	@echo "  run      Run both frontend and backend (in separate terminals)"
	@echo "  clean    Remove virtual environment and node_modules"

venv:
	@echo "Creating Python virtual environment..."
	python -m venv $(VENV_PATH)
	@echo "Virtual environment created at $(VENV_PATH)"

install: venv
	@echo "Installing Python dependencies..."
	. $(VENV_PATH)/bin/activate && pip install -r requirements.txt
	@echo "\nInstalling Node.js dependencies..."
	npm install

frontend:
	@echo "Starting Node.js development server..."
	npm run dev

backend:
	@echo "Starting Python backend server..."
	. $(VENV_PATH)/bin/activate && python server.py

run:
	@echo "Run these in two separate terminal windows:"
	@echo "1. make frontend"
	@echo "2. make backend"

clean:
	@echo "Cleaning up..."
	rm -rf $(VENV_PATH)
	rm -rf node_modules
	@echo "Clean complete"