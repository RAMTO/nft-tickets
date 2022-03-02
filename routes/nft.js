var express = require('express');
var path = require('path');
var router = express.Router();
var ethers = require('ethers');
var fs = require('fs'),
  json;
var mysql = require('mysql2');
const { exit } = require('process');
const getJSON = require('get-json');
require('dotenv').config();

const typeMapping = {
  regular: 0,
  vip: 2,
};

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

/* GET home page. */
router.post('/', async function (req, res, next) {
  if (req.body.address) {
    const { address: userAddress } = req.body;

    const contract = await getContract(
      process.env.POLYGON_RPC_URL,
      process.env.WALLET_PRIVATE_KEY,
      process.env.CONTRACT_ADDRESS,
    );

    const ids = await contract.getOwnerNFTs(userAddress);

    if (ids.length > 0) {
      const nfts = [];
      for (const id of ids) {
        const uri = await contract.uri(0);
        uriReplaced = uri.replace('{id}', id);
        try {
          console.log('Fetching json...');
          console.log(uriReplaced);
          const json = await getJSON(uriReplaced);
          nfts.push(json);
        } catch (e) {
          console.error('Error fetching json', e);
        }
      }

      if (nfts.length > 0) {
        res.json({ status: 1, nfts });
      } else {
        res.json({ status: 2 });
      }
    } else {
      res.json({ status: 2 });
    }
  }
});

module.exports = router;
