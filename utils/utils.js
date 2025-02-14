const getCurrentDate = () => {
    const date = new Date().toLocaleDateString("en-CA");
    const time = new Date().toLocaleTimeString("en-GB", { hour12: false });

    return { date, time };
}

module.exports = { getCurrentDate };