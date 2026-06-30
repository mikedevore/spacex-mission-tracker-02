# Project Recovery Instructions

If something goes wrong or you need to restore your application in a new environment, you have multiple fallback options. Please follow the instructions below based on how you want to restore the project.

## Option 1: Restoring in Google AI Studio

If your current session crashes or you want to start a fresh AI Studio project with your current codebase, you can use the ZIP file export.

1. **Download the ZIP**: Click the settings or export button in your current AI Studio workspace and select "Export as ZIP" (or download to local).
2. **Create New Project**: Open Google AI Studio and start a new project.
3. **Upload the ZIP**: Use the file upload mechanism or drag-and-drop the downloaded ZIP file into the new project workspace.
4. **Prompt the AI**: Let the AI know you are restoring a previous project. For example: *"I have uploaded a ZIP of my project. Please restore it, install the dependencies, and start the development server."*

## Option 2: Running the Project Locally (On Your Computer)

Since this app is built with standard web technologies (React, Vite, Node.js), you can run it on your own computer without any AI assistant.

**Prerequisites:** 
You must have [Node.js](https://nodejs.org) installed on your computer.

1. **Extract the ZIP**: Unzip your project files into a folder on your computer.
2. **Open Terminal/Command Prompt**: Navigate to the folder you just extracted.
3. **Install Dependencies**: Run the following command to download all necessary packages:
   ```bash
   npm install
   ```
4. **Start the App**: Run the development server:
   ```bash
   npm run dev
   ```
5. **View the App**: Open your browser and go to `http://localhost:3000` (or the port specified in your terminal).

## Option 3: Exporting to GitHub

If you prefer to keep a cloud-based backup, you can export your project to GitHub.
1. Use the AI Studio export feature to push your code directly to a GitHub repository.
2. From there, you can clone it to your computer, host it on platforms like Vercel or Netlify, or import it back into AI Studio later.

## Troubleshooting

- **White Screen / Crash on Load**: If the app fails to load, ensure all dependencies are installed (`npm install`). Also, verify if any third-party APIs (like SpaceX or Launch Library) are experiencing downtime.
- **ChatGPT Artifacts**: ChatGPT's built-in code editor (Artifacts) sometimes struggles with full React/Vite applications because it has specific rendering limitations. Running it via Node.js on your computer or restoring it in AI Studio provides a more stable, full-featured environment.
