async function registerDonor() {
    const name = document.getElementById('name').value;
    const bloodGroup = document.getElementById('bloodGroup').value;
    const location = document.getElementById('location').value;

    await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name,
            bloodGroup,
            location,
            available: true
        })
    });

    alert("Registered Successfully!");
}

async function findDonor() {
    const bloodGroup = document.getElementById('searchBlood').value;
    const location = document.getElementById('searchLocation').value;

    const res = await fetch('/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bloodGroup, location })
    });

    const data = await res.json();

    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = "";

    if (data.length === 0) {
        resultsDiv.innerHTML = "No donors found.";
        return;
    }

    data.forEach(donor => {
        resultsDiv.innerHTML += `<p>${donor.name} - ${donor.bloodGroup} - ${donor.location}</p>`;
    });
}