
# Todo List App

This is a Next.js app with a dynamic todo list. You can add tasks and edit columns of types: Status, Dropdown, Text, Date, People, and Numbers. Data is persisted in-memory via API routes.

## Features
- Add tasks
- Edit task values for each column type
- Dynamic columns: Status, Dropdown, Text, Date, People, Numbers
- Material-UI and Tailwind CSS styling

## Getting Started

1. Install dependencies:
	```sh
	cd client
	npm install
	```
2. Run the development server:
	```sh
	npm run dev
	```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Notes
- Data is not persisted after server restart (in-memory only).
- You can extend columns and backend logic as needed.
