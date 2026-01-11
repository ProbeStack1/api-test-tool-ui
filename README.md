# ProbeStack-Testing

A modern, feature-rich API client built with React and Vite. Send HTTP requests, manage collections, and test APIs with ease.

## 🚀 Local Setup

### Prerequisites

- **Node.js** (v16 or higher recommended)
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify installation: `node --version` and `npm --version`

### Installation Steps

1. **Clone or navigate to the project directory**
   ```bash
   cd probestack-testing
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   This will install all required packages including React, Vite, Tailwind CSS, Axios, and other dependencies.

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   - The app will typically be available at `http://localhost:5173`
   - Check the terminal output for the exact URL
   - The page will automatically reload when you make changes

### Available Scripts

- `npm run dev` - Start the development server with hot module replacement (HMR)
- `npm run build` - Build the app for production (outputs to `dist/` folder)
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint to check code quality

## 📁 Project Structure

```
probestack-testing/
├── src/
│   ├── components/          # React components
│   │   ├── sidebar/        # Sidebar-related components
│   │   ├── AuthPanel.jsx   # Authentication configuration
│   │   ├── CodeEditor.jsx  # Code editor for request body
│   │   ├── Explore.jsx     # Public APIs explorer
│   │   ├── Home.jsx        # Home page
│   │   ├── KeyValueEditor.jsx # Key-value pair editor
│   │   ├── RequestPanel.jsx   # Request configuration UI
│   │   ├── ResponsePanel.jsx  # Response display
│   │   ├── Reports.jsx        # Reports/analytics view
│   │   ├── Sidebar.jsx        # Main sidebar
│   │   └── Tabs.jsx           # Tab navigation
│   ├── utils/
│   │   └── api.js          # API request utilities
│   ├── App.jsx             # Main app component
│   ├── main.jsx            # Entry point
│   └── index.css           # Global styles
├── public/                 # Static assets
├── index.html              # HTML template
├── package.json            # Dependencies and scripts
├── vite.config.js          # Vite configuration
└── tailwind.config.js      # Tailwind CSS configuration (if exists)

```

## 🛠️ Tech Stack

- **React 19** - UI library
- **Vite 7** - Build tool and dev server
- **Tailwind CSS 4** - Utility-first CSS framework
- **Axios** - HTTP client
- **Lucide React** - Icon library
- **Recharts** - Charts library for reports

## 💡 Features

- Send HTTP requests (GET, POST, PUT, DELETE, etc.)
- Configure headers, query parameters, and request body
- View response data, headers, status codes, and timing
- Manage collections and environments
- Explore public APIs
- Request history stored in browser localStorage
- Beautiful, modern UI with dark theme

## 📝 Notes

- This is a frontend-only application
- No backend server or database required
- Request history is stored in browser localStorage
- CORS restrictions may apply when testing APIs from different domains

## 🐛 Troubleshooting

**Port already in use?**
- Change the port in `vite.config.js` or use: `npm run dev -- --port 3000`

**Dependencies installation issues?**
- Delete `node_modules` and `package-lock.json`, then run `npm install` again
- Ensure you're using Node.js v16 or higher

**Module not found errors?**
- Run `npm install` to ensure all dependencies are installed
- Clear node_modules and reinstall if needed

## 📄 License

This project is open source and available for personal/educational use.
# api-test-tool-ui
