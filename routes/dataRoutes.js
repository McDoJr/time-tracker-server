const router = require('express').Router();
const { fetchUserData, setTimeIn, fetchLogs } = require('../controller/dataController');

router.post('/fetch_user', fetchUserData);
router.post('/fetch_logs', fetchLogs);
router.post('/update', setTimeIn);

module.exports = router;