var express = require('express');
var path = require('path');
var router = express.Router();
var ethers = require('ethers');
var fs = require('fs'),
  json;
const connection = require('../helpers/db');
const { exit } = require('process');
require('dotenv').config();

const typeMapping = {
  regular: 0,
  vip: 2,
};

/* GET home page. */
router.get('/', async function (req, res, next) {
  const { id: ticketId } = req.query;

  const query = `SELECT * FROM tickets AS t WHERE t.uuid = '${req.query.id}'`;

  let ticketType = 0;
  let nftMinted = 0;
  let ticketValid = 0;
  let ticketWhitelisted = 0;

  connection.query(query, async (err, results, fields) => {
    if (results.length > 0) {
      const { is_whitelisted, type, is_nft_minted } = results[0];

      ticketValid = 1;
      ticketType = typeMapping[type];
      nftMinted = is_nft_minted;
      ticketWhitelisted = is_whitelisted;
    } else {
      console.log('Invalid ticket id');
    }

    res.render('index', {
      title: 'Express',
      id: parseInt(req.query.id),
      ticket: {
        id: ticketId,
        type: ticketType,
        nft_mint: nftMinted,
        valid: ticketValid,
        whitelisted: ticketWhitelisted,
        isMinting: Number(process.env.IS_MINTING),
      },
    });
  });
});

module.exports = router;
