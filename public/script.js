async function registerDonor() {
    const name = document.getElementById('name').value;
    const bloodGroup = document.getElementById('bloodGroup').value;
    const location = document.getElementById('location').value;

    const msg = document.getElementById('registerMsg');
    msg.innerText = "Registering...";

    await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, bloodGroup, location, available: true })
    });

    msg.innerText = "✅ Registered Successfully!";
}

async function findDonor() {
    const bloodGroup = document.getElementById('searchBlood').value;
    const location = document.getElementById('searchLocation').value;

    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = "🔍 Searching donors...";

    const res = await fetch('/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bloodGroup, location })
    });

    const data = await res.json();
    resultsDiv.innerHTML = "";

    if (data.length === 0) {
        resultsDiv.innerHTML = "<p>No donors found.</p>";
        return;
    }

    data.forEach(donor => {
        const card = document.createElement('div');
        card.className = "donor-card";
        card.innerHTML = `
            <strong>${donor.name}</strong><br>
            🩸 Blood Group: ${donor.bloodGroup}<br>
            📍 Location: ${donor.location}
        `;
        resultsDiv.appendChild(card);
    });
}