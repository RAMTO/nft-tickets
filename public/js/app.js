App = {
  web3Provider: null,
  contract_address: new String('0x04b33ca2CfBf0Fef61BC3b4492de2525bb08D2D5'),
  contracts: {},
  account: new String(''),
  web3,

  init: async function () {
    return await App.initWeb3();
  },

  initWeb3: async function () {
    // Modern dapp browsers...
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      console.log('Web3 provider set to window.etherium');
      try {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        App.account = window.ethereum.selectedAddress;
        document.cookie = 'bcadr=' + App.account;
        console.log('Account set to ' + App.account);
        $('.js-container-address').text(App.account);
      } catch (error) {
        // User denied account access...
        console.error('User denied account access');
        $('.js-wallet-container').hide();
        $('.js-warning-container').show();
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
      console.log('HTTP Providder set to legacy dapp browser');
    }
    // If no injected web3 instance is detected, fall back to Ganache
    else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
      console.log('HTTP Providder set to Ganache');
    }

    App.web3 = new Web3(App.web3Provider);

    return App.initContract();
  },

  initContract: async function () {
    $.getJSON('CryptoRevolution.json', function (data) {
      var web3 = App.web3;

      var CryptoRevolutionArtifact = data['abi'];
      App.contracts.CryptoRevolution = new web3.eth.Contract(
        CryptoRevolutionArtifact,
        App.contract_address,
      );
      App.contracts.CryptoRevolution.options.address = App.contract_address;
    });

    return App.bindEvents();
  },

  bindEvents: function () {
    $(document).on('click', '.btn-mint', App.handleMint);
    $(document).on('click', '.btn-show-nfts', App.ShowNFTs);
    $(document).on('click', '.btn-convert', App.ConvertNFT);
    $(document).on('click', '.btn-transfer', App.TransferNFT);
  },

  handleMint: async function (event) {
    event.preventDefault();
    const $this = $(this);
    const id = $this.data('id');
    $this.hide();

    $('.js-container-loading').removeClass('d-none').addClass('d-flex');
    $('.js-container-success').hide();
    $('.js-container-failure').hide();

    $.post('/mint', { id })
      .done(function (response) {
        const { status } = response;

        if (status === 1) {
          $('.js-container-success').show();
          $('.js-container-failure').hide();
        } else {
          $('.js-container-failure').show();
          $('.js-container-success').hide();
          $this.show();
        }
      })
      .fail(function () {
        alert('error');
      })
      .always(function () {
        $('.js-container-loading').removeClass('d-flex').addClass('d-none');
      });
  },

  ShowNFTs: async function () {
    console.log('Show NFTs!');

    App.contracts.CryptoRevolution.methods.getNFTOwners().call((error, result) => {
      if (!error) {
        //console.log(result);
        for (i = 0; i < result.length; i++) {
          App.getOwnerNFTs(result[i]);
        }
      } else {
        console.log(error);
      }
    });
  },

  getOwnerNFTs: async function (owner) {
    console.log('getOwnerNFTs!');
    var ownerNFTs = await App.contracts.CryptoRevolution.methods.getOwnerNFTs(owner).call();
    const URI = await App.GetNFTURI(0);

    var NFTsRow = $('#NFTsRow');
    NFTsRow.empty();

    for (i = 0; i < ownerNFTs.length; i++) {
      let uri_per_id = URI;
      uri_per_id = uri_per_id.replace('{id}', ownerNFTs[i]);

      var NFTTemplate = $('#NFTTemplate');
      NFTTemplate.find('.token-owner').text(owner);
      NFTTemplate.find('.token-id').text(ownerNFTs[i]);
      NFTTemplate.find('.token-url').text(uri_per_id);
      NFTsRow.append(NFTTemplate.html());
    }

    App.GetImgFromMeta();
  },

  GetNFTURI: async function (nft_id) {
    return await App.contracts.CryptoRevolution.methods.uri(nft_id).call();
  },

  GetImgFromMeta: async function () {
    var ids = [];
    // Find all ids
    var token_div = $('.single_container');
    for (i = 0; i < token_div.length; i++) {
      var token = $(token_div[i]).find('.token-id');
      if ($(token).text() != '' && !ids.includes($(token).text())) {
        ids.push($(token).text());
      }
    }

    // Query URIs for ids
    const URI = await App.GetNFTURI(0);
    URLs = {};
    for (i = 0; i < ids.length; i++) {
      let uri_per_id = URI;
      uri_per_id = uri_per_id.replace('{id}', ids[i]);
      URLs[ids[i]] = uri_per_id;
    }

    // Query the jsons of all ids
    var dict = {};
    for (const [key, value] of Object.entries(URLs)) {
      var data = await await $.getJSON(value);
      dict[key] = data['image'];
    }

    // Walk through all added items and add the image
    var bodies = $('.panel-body-nft');
    for (i = 0; i < bodies.length; i++) {
      var local_token_id_div = $(bodies[i]).find('.token-id');
      if ($(local_token_id_div).text() != '') {
        var token_id = parseInt(local_token_id_div.text());
        var img_el = $(bodies[i]).children('img');
        $(img_el).attr('src', dict[token_id]);
      }
    }
  },

  ConvertNFT: async function () {
    console.log('Convert!');

    var nft_level = $('#level').val();

    const gasAmount = await App.contracts.CryptoRevolution.methods
      .convertNFT(App.account, nft_level)
      .estimateGas({ from: App.account });
    console.log('Convert gas - ' + gasAmount);
    return App.contracts.CryptoRevolution.methods
      .convertNFT(App.account, nft_level)
      .send({ from: App.account, gas: gasAmount })
      .on('transactionHash', function (hash) {})
      .on('receipt', function (receipt) {})
      .on('confirmation', function (confirmationNumber, receipt) {
        App.ShowNFTs();
      })
      .on('error', console.error);
  },

  TransferNFT: async function () {
    console.log('Mint!');

    var nft_level = $('#level').val();
    var nft_int = parseInt(nft_level);
    var to_address_str = $('#toAddress').val();

    var to_address;
    try {
      to_address = App.web3.utils.toChecksumAddress(to_address_str);
    } catch (e) {
      console.error('invalid ethereum address', e.message);
    }

    console.log('Transferring from: ' + App.account);
    console.log('To: ' + to_address);
    console.log('NFT level: ' + nft_int);

    const gasAmount = await App.contracts.CryptoRevolution.methods
      .safeTransferFrom(App.account, to_address, parseInt(nft_level), 1, '0x5174e853')
      .estimateGas({ from: App.account, to: to_address });
    //console.log("Mint gas - " + gasAmount);
    await App.contracts.CryptoRevolution.methods
      .safeTransferFrom(App.account, to_address, parseInt(nft_level), 1, '0x5174e853')
      .send({ from: App.account, to: to_address, gas: gasAmount })
      .on('transactionHash', function (hash) {})
      .on('receipt', function (receipt) {})
      .on('confirmation', function (confirmationNumber, receipt) {
        App.ShowNFTs();
      })
      .on('error', console.error);
  },

  VerifyIssuerID: async function (id, nft_type) {
    var ids_json;
    await $.getJSON('./json/ids.json', function (json) {
      ids_json = json;
    });

    console.log('Searching for id ' + id + ', of type ' + nft_type);
    typeStr = '';

    if (nft_type == 0) typeStr = 'Visitors';
    if (nft_type == 2) typeStr = 'VIPs';
    if (nft_type == 4) typeStr = 'Sponsors';
    if (nft_type == 6) typeStr = 'Lecturers';

    var match = false;
    for (i in ids_json[typeStr]) {
      if (ids_json[typeStr][i] == id) {
        match = true;
      }
    }

    if (match) return true;

    return false;
  },
};

$(function () {
  $(window).load(function () {
    App.init();
  });
});
