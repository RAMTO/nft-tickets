var express = require('express');
var path = require('path');
var router = express.Router();
var ethers = require('ethers');
var fs = require('fs'),
  json;
var mysql = require('mysql2');
const { exit } = require('process');
require('dotenv').config();

const typeMapping = {
  regular: 0,
  vip: 1,
};

function connectMySQL() {
  const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    password: process.env.DB_PASSWORD,
  });

  connection.connect(function (err) {
    if (err) {
      return console.error('error: ' + err.message);
    }

    console.log('Connected to the MySQL server.');
  });

  return connection;
}

function readJsonFileSync(file, encoding) {
  var jsonPath = path.join(__dirname, '..', 'data', file + '.json');

  if (typeof encoding == 'undefined') {
    encoding = 'utf8';
  }

  return JSON.parse(fs.readFileSync(jsonPath, encoding));
}

async function getContract(_providerUrl, _privateKey, _contractAddress) {
  const provider = new ethers.providers.JsonRpcProvider(_providerUrl);
  const signer = new ethers.Wallet(_privateKey, provider);
  const contractJSON = readJsonFileSync('CryptoRevolution');

  const contract = new ethers.Contract(_contractAddress, contractJSON.abi, signer);

  return contract;
}

async function mintNFT(ticketType, req) {
  const contract = await getContract(
    process.env.POLYGON_RPC_URL,
    process.env.WALLET_PRIVATE_KEY,
    process.env.CONTRACT_ADDRESS,
  );

  const { bcadr: addressTo } = req.cookies;

  try {
    const tx = await contract.mintNFT(addressTo, ticketType, {
      gasPrice: 600000000000,
    });

    console.log('Minting...');
    await tx.wait();
    console.log('Minted!');

    return true;
  } catch (e) {
    return false;
  }
}

/* GET home page. */
router.post('/', async function (req, res, next) {
  if (req.body.id) {
    const { id: ticketId } = req.body;
    const connection = connectMySQL();

    const query = `SELECT * FROM tickets AS t WHERE t.uuid = '${ticketId}'`;

    connection.query(query, async (err, results, fields) => {
      if (results.length > 0) {
        const { type, is_nft_minted } = results[0];
        console.log('type', type);
        if (type === 'speaker') {
          let { speaker_type } = results[0];
          ticketType = speaker_type;
        } else {
          ticketType = typeMapping[type];
        }

        if (is_nft_minted == 0) {
          try {
            process.env.IS_MINTING = 1;
            console.log('ticketType', ticketType);
            const response = await mintNFT(ticketType, req);
            process.env.IS_MINTING = 0;

            if (response) {
              let updateQuery = `UPDATE tickets SET is_nft_minted = 1 WHERE uuid = '${ticketId}'`;
              connection.query(updateQuery, async (err, results, fields) => {
                console.log('results', results);
                res.json({ status: 1 });
              });
            } else {
              console.log('Problem with minting');
              res.json({ status: 2 });
            }
          } catch (e) {
            console.log('Error in minting');
            res.json({ status: 2 });
          }
        } else {
          console.log('NTF is allready minted');
          res.json({ status: 2 });
        }
      } else {
        console.log('Invalid ticket id');
        res.json({ status: 2 });
      }
    });
  }
});

module.exports = router;
