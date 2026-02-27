const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const peoplePath = path.join(__dirname, 'server/data/people.json');
const workspacesPath = path.join(__dirname, 'server/data/workspaces.json');

// Update People
if (fs.existsSync(peoplePath)) {
    const people = JSON.parse(fs.readFileSync(peoplePath, 'utf8'));
    people.forEach(p => {
        if (!p.id) {
            if (p.email === 'valonhalili74@gmail.com') {
                p.id = 'user-valon-12345'; // Specific ID for Valon
            } else {
                p.id = uuidv4();
            }
        }
    });
    fs.writeFileSync(peoplePath, JSON.stringify(people, null, 2));
    console.log('Updated people.json with IDs');
}

// Update Workspaces
if (fs.existsSync(workspacesPath)) {
    const workspaces = JSON.parse(fs.readFileSync(workspacesPath, 'utf8'));
    workspaces.forEach(w => {
        if (!w.ownerId) {
            w.ownerId = 'user-valon-12345'; // Assign existing workspaces to Valon
        }
    });
    fs.writeFileSync(workspacesPath, JSON.stringify(workspaces, null, 2));
    console.log('Updated workspaces.json with ownerIds');
}
