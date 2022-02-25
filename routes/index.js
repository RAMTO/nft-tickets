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
  vip: 2,
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

  console.log(`Will mint to ${addressTo} with ${ticketType}`);
  const tx = await contract.mintNFT(addressTo, ticketType, {
    gasPrice: 600000000000,
  });
  console.log('Minting...');
  await tx.wait();
  console.log('Minted!');
  console.log('TX', tx);

  return true;
}

/* GET home page. */
router.get('/', async function (req, res, next) {
  if (req.query.id) {
    const { id: ticketId } = req.query;
    const connection = connectMySQL();

    const query = `SELECT * FROM tickets AS t WHERE t.uuid = '${req.query.id}'`;

    let ticketType = 0;
    let nftMinted = 0;

    connection.query(query, async (err, results, fields) => {
      if (results.length > 0) {
        console.log('Ticket found');
        const { is_activated, is_verified, type, is_nft_minted } = results[0];

        console.log('is_nft_minted', is_nft_minted);

        ticketType = typeMapping[type];
        nftMinted = is_nft_minted;

        if (req.query.nft_done && req.query.id) {
          if (is_nft_minted == 0) {
            const response = await mintNFT(ticketType, req);

            if (response) {
              let updateQuery = `UPDATE tickets SET is_nft_minted = 1 WHERE uuid = '${ticketId}'`;
              connection.query(updateQuery, async (err, results, fields) => {
                console.log('results', results);
                res.redirect('/?id=' + req.query.id);
                exit;
              });
            } else {
              console.log('Problem with minting');
            }
          } else {
            console.log('NTF is allready minted');
          }
        }
      } else {
        console.log('Invalid ticket id');
      }

      console.log('nftMinted', nftMinted);

      res.render('index', {
        title: 'Express',
        id: parseInt(req.query.id),
        ticket: {
          id: ticketId,
          type: ticketType,
          nft_mint: nftMinted,
          valid: 1,
        },
      });
    });
  }
});

module.exports = router;
