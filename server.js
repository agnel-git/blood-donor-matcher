const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const PORT = 3000;

// Load donors
function loadDonors() {
    const data = fs.readFileSync('donors.json');
    return JSON.parse(data);
}

// Save donors
function saveDonors(donors) {
    fs.writeFileSync('donors.json', JSON.stringify(donors, null, 2));
}

// Register donor
app.post('/register', (req, res) => {
    const donors = loadDonors();
    donors.push(req.body);
    saveDonors(donors);
    res.json({ message: "Donor Registered Successfully" });
});

// Find donor
app.post('/find', (req, res) => {
    const { bloodGroup, location } = req.body;
    const donors = loadDonors();

    const matches = donors.filter(d =>
        d.bloodGroup === bloodGroup &&
        d.location.toLowerCase() === location.toLowerCase() &&
        d.available === true
    );

    res.json(matches);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});