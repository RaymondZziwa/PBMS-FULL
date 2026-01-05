const app = require('./app');
const dotenv = require('dotenv')
dotenv.config({ path: './.env' });

const PORT = process.env.PORT || 3008;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});