var express = require('express');
var path = require('path');
var router = express.Router();
var ethers = require('ethers');
var fs = require('fs'),
  json;
var mysql = require('mysql2');
require('dotenv').config();

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

async function mintNFT(ticket, req) {
  const contract = await getContract(
    process.env.POLYGON_RPC_URL,
    process.env.WALLET_PRIVATE_KEY,
    process.env.CONTRACT_ADDRESS,
  );

  const { type, id } = ticket;
  const { bcadr: addressTo } = req.cookies;

  console.log(`Will mint to ${addressTo} with ${type}`);
  const tx = await contract.mintNFT(addressTo, type, {
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
    var ticket = { id: '', type: '', nft_mint: 0, valid: 0 };
    const connection = connectMySQL();

    connection.query(
      'SELECT * FROM tickets',
      // 'SELECT * FROM tickets AS t WHERE t.uuid = your_ticket_uuid',
      function (err, results, fields) {
        console.log(results); // results contains rows returned by server
        console.log(fields); // fields contains extra meta data about results, if available
      },
    );

    json_data = readJsonFileSync('ids');

    for (var i = 0; i < json_data.length; ++i) {
      if (json_data[i].id == req.query.id) {
        ticket = json_data[i];
      }
    }

    if (req.query.nft_done && req.query.id) {
      for (var i = 0; i < json_data.length; ++i) {
        if (json_data[i].id == req.query.id) {
          json_data[i].nft_mint = 0;

          var jsonPath = path.join(__dirname, '..', 'data', 'ids.json');

          const response = await mintNFT(ticket, req);

          if (response) {
            fs.writeFileSync(jsonPath, JSON.stringify(json_data, null, 4));
            console.log('JSON updated!');
          }

          res.redirect('/?id=' + req.query.id);
        }
      }
    }

    res.render('index', {
      title: 'Express',
      id: parseInt(req.query.id),
      ticket: ticket,
    });
  }
});

module.exports = router;
