App = {
  web3Provider: null,
  contract_address: new String('0xe4c7823ecbac863d213907Ca11dfAAF15cC38b4B'),
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
        $('.js-show-nft').data('address', App.account);

        const mintBtn = $('.btn-mint');

        if (mintBtn.length === 0) {
          this.showNFT(App.account);
        }
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
          $('.js-container-loading').removeClass('d-flex').addClass('d-none');

          App.showNFT(App.account);
        } else {
          $('.js-container-loading').removeClass('d-flex').addClass('d-none');
          $('.js-container-failure').show();
          $('.js-container-success').hide();
          $this.show();
        }
      })
      .fail(function () {
        $('.js-container-loading').removeClass('d-flex').addClass('d-none');
        alert('error');
      });
  },

  showNFT: function (address) {
    $('.js-container-loading').removeClass('d-none').addClass('d-flex');

    $.post('/nft', { address })
      .done(function (response) {
        const { status, nfts } = response;
        if (status === 1) {
          const templateItems = nfts.map(nft => {
            return `
             <div class='col-md-4 mb-4'>
              <div class="card">
                <img src="${nft.image}" class="card-img-top" alt="...">
                <div class="card-body">
                  <h5 class="card-title">${nft.name}</h5>
                  <p class="card-text">${nft.description}</p>
                </div>
              </div>
            </div>
            `;
          });
          const templateItemsSting = templateItems.join('');
          $('.js-container-cards').html(templateItemsSting);
        } else {
          console.log('Problem');
        }
      })
      .fail(function () {
        alert('error');
      })
      .always(function () {
        $('.js-container-loading').removeClass('d-flex').addClass('d-none');
      });
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
        App.ShowNFT(App.account);
      })
      .on('error', console.error);
  },
};

$(function () {
  $(window).load(function () {
    App.init();
  });
});
