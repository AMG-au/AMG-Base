# AI Agent Guide for AMG-Base

## Project Overview
This is a web-based car dealership management system built with vanilla JavaScript, HTML, and CSS. It provides functionality for managing car inventory, tracking sales, generating analytics, and maintaining detailed car history records. The application uses GitHub Pages for deployment and persists data via JSON files.

## Build & Test
```bash
# No build step required - vanilla JS project
# Open index.html directly in browser for development
# For local testing with live reload (optional):
python3 -m http.server 8000
# or
npx serve .
```

## Architecture Overview
The application is a single-page application (SPA) with:
- `index.html` - Main HTML structure with modals and sections
- `script.js` - Core JavaScript logic for car management, filtering, and data persistence
- `style.css` - All styling and responsive design
- `data.json` - Persistent storage for car inventory data
- `.nojekyll` - Ensures GitHub Pages serves all files correctly

## Key Features
- **Car Inventory Management**: Add, edit, delete, and track cars
- **Sales Tracking**: Record sales with various payment methods (cash, credit, leasing)
- **Analytics Dashboard**: Monthly sales statistics and performance metrics
- **History Tracking**: Complete audit trail of all car operations
- **Excel Export/Import**: Data exchange via Excel and JSON formats
- **Real-time Sync**: Auto-save and synchronization capabilities

## Git Workflow
```bash
# Always work on feature branches
git checkout -b feature/your-feature-name

# Commit with descriptive messages
git add .
git commit -m "feat: add new feature" # or fix:, docs:, style:, refactor:

# Push to remote
git push origin feature/your-feature-name

# Create PR for review
```

## Conventions & Patterns
- **File Organization**: All files in root directory for GitHub Pages compatibility
- **Data Storage**: JSON format in `data.json` with backup capabilities
- **Naming**: 
  - Functions: camelCase (e.g., `renderCarsList`, `saveCarsData`)
  - IDs: kebab-case in HTML (e.g., `car-modal`, `quick-sale-form`)
  - Classes: kebab-case in CSS (e.g., `.car-card`, `.modal-content`)
- **State Management**: Global `cars` array with localStorage backup
- **Event Handling**: Inline onclick handlers and addEventListener
- **Date Format**: ISO 8601 for storage, localized display for UI

## Security & Sensitive Data
- **Confidential Fields**: Price data (`priceToHands`, `priceSalon`, `salePrice`) requires special modal
- **Commission Data**: Protected in confidential view
- **VIN Numbers**: Sensitive car identification data
- **No API Keys**: Currently no external API integrations
- **Data Backup**: Regular export to JSON/Excel recommended

## Testing Checklist
Before committing changes:
- [ ] Test all CRUD operations (Create, Read, Update, Delete) for cars
- [ ] Verify filtering works (status, brand, supplier filters)
- [ ] Check modal functionality (add, edit, quick sale, return, confidential)
- [ ] Validate data persistence (save/load from data.json)
- [ ] Test Excel export/import functionality
- [ ] Ensure responsive design on mobile/tablet/desktop
- [ ] Verify history tracking for all operations
- [ ] Check analytics calculations are correct

## Common Operations

### Adding a New Feature
1. Identify the section (Cars, Dashboard, History, Analytics)
2. Add HTML structure if needed
3. Implement JavaScript logic in `script.js`
4. Style with CSS in `style.css`
5. Test data persistence with `data.json`
6. Update any affected modals or forms

### Modifying Car Fields
1. Update form in `#carModal` in `index.html`
2. Modify car object structure in `script.js`
3. Update render functions (`renderCarsList`, `renderCarCard`)
4. Ensure data migration for existing `data.json`
5. Update Excel export/import mappings

### Fixing Bugs
1. Check browser console for JavaScript errors
2. Verify data integrity in `data.json`
3. Test with different browsers (Chrome, Firefox, Safari)
4. Clear localStorage if caching issues
5. Ensure all event listeners are properly attached

## Deployment
The application is deployed via GitHub Pages:
```bash
# Changes pushed to main branch auto-deploy
git checkout main
git merge feature/your-feature-name
git push origin main
# Site available at: https://[username].github.io/AMG-Base/
```

## External Dependencies
- **xlsx.js** (v0.18.5): Excel file manipulation via CDN
- No package manager or build tools required
- Pure vanilla JavaScript - no framework dependencies

## Gotchas & Important Notes
- **Auto-save**: Changes auto-save every 30 seconds - don't rely on manual save
- **Date Handling**: Always use ISO format for storage, convert for display
- **Modal Z-index**: New modals must have higher z-index than existing ones
- **Local Storage Limits**: Large inventories may exceed browser limits
- **Excel Formulas**: Not preserved during import/export - data only
- **History Archival**: Old history entries should be periodically archived
- **Commission Calculation**: Based on credit reward coefficient field

## Support & Documentation
- GitHub Issues for bug reports and feature requests
- Maintain this AGENTS.md file when adding new features
- Document any new confidential fields or sensitive data handling