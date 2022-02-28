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
        const json = await getJSON(uriReplaced);
        nfts.push(json);
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
