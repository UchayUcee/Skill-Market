import Web3 from "web3";
import { newKitFromWeb3 } from "@celo/contractkit";
import BigNumber from "bignumber.js";
import SkillMarketAbi from "../contract/SkillMarket.abi.json";
import erc20Abi from "../contract/erc20.abi.json";

const ERC20_DECIMALS = 18;
const MPContractAddress = "0x3AAabCa1496b9a42C4d6f9eb48b4f8C9Ad1374A5";
const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

const addServiceBtn = document.getElementById('add-service-btn');
const addServiceModal = document.getElementById('add-service-modal');
const closeBtn = document.querySelector('.close');
const addServiceForm = document.getElementById('add-service-form');
const skillsList = document.getElementById('skills-list');
//const updateBtn = document.querySelector('.update-btn');

let kit;
let contract;
let skills = [];

const connectCeloWallet = async function () {
    if (window.celo){
        console.log("Remember the Celo Wallet is not available on desktop browsers. You need the CeloExtensionWallet to connect to the Celo network.")
        try{
            await window.celo.enable();

            const web3 = new Web3(window.celo);
            kit = newKitFromWeb3(web3);

            const accounts = await kit.web3.eth.getAccounts();
            kit.defaultAccount = accounts[0];

            contract = new kit.web3.eth.Contract(
                SkillMarketAbi,
                MPContractAddress
            );
        } catch (error) {
            console.log(error);
        }
    } else {
        console.log("Please install the CeloExtensionWallet.");
    }
};

async function approve(_price) {
    const cUSDContract = new kit.web3.eth.Contract(
        erc20Abi,
        cUSDContractAddress
    );

    const result = await cUSDContract.methods
        .approve(MPContractAddress, _price)
        .send({ from: kit.defaultAccount });
    return result;
}

const getBalance = async function () {
    const totalBalance = await kit.getTotalBalance(kit.defaultAccount);
    const cUSDBalance = totalBalance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2);
    document.querySelector("#celo-balance-value").textContent = cUSDBalance;
};

const getServices = async function () {
    const _numberOfServicesAvailable = await contract.methods.viewNumberOfServicesAvailable().call();
    const _services = [];

    for (let i = 0; i < _numberOfServicesAvailable; i++){
        let _service = new Promise(async(resolve, reject) => {
            let p = await contract.methods.viewService(i).call();
            resolve({
                index: i,
                provider: p[0],
                serviceId: p[1],
                serviceName: p[2],
                serviceDescription: p[3],
                servicePrice: new BigNumber(p[4]),
                serviceReputation: p[5],
                totalNumberOfClients: p[6]
            });
        });
        _services.push(_service);
    }
    skills = await Promise.all(_services);
    renderServices();
}

function renderServices(){
    skillsList.innerHTML = '';

    skills.forEach((_service) =>{
        const skillCard = document.createElement('div');
        skillCard.className = 'skill-card';
        skillCard.innerHTML = `
        <h3>${_service.serviceName}</h3>
        <p>${_service.serviceDescription}</p>
        <p></p>
        <p>Price: ${_service.servicePrice.shiftedBy(-ERC20_DECIMALS).toFixed(2)} cUSD </p>
        <p> ${_service.totalNumberOfClients} Clients have used this service</p>
        <p>Reputation: ${_service.serviceReputation}</p>
        <button class="purchase-btn" id=${_service.index}">Hire</button>
        <button class="update-btn" id=${_service.index}>Update</button>
        <button class="remove-btn" id=${_service.index}>Remove</button>
        `;
    
        skillsList.appendChild(skillCard);
    });

}

document.querySelector('#skills-list').addEventListener('click', async(e) =>{
    if(e.target.className.includes('remove-btn')){
        const index= e.target.id;

        try{
            const result = await contract.methods.removeService(index).send({ from: kit.defaultAccount });
            console.log(`Removed "${skills[index].serviceName}"`);
            getServices();
        } catch(error){
            console.log(error);
        }
    }
} );

document.querySelector('#skills-list').addEventListener('click', async (e) => {
    if (e.target.className.includes('purchase-btn')) {
        const index = parseInt(e.target.id, 10);
        try {
            const result1 = await approve(skills[index].servicePrice);
            console.log('Awaiting payment for this service');

            try {
                const result = await contract.methods.purchaseService(index).send({ from: kit.defaultAccount });
                console.log(`Purchased "${skills[index].serviceName}"`);
                
                // Refresh the skills list after a successful purchase
                await getServices();
                await getBalance();
            } catch (error) {
                console.log(error);
            }
        } catch (error) {
            console.log(error);
        }
    }
});

document.querySelector('#skills-list').addEventListener('click', async(e) =>{
    if(e.target.className.includes('update-btn')){

        let newPrice = prompt("Enter new Price:");
        let newDescription = prompt("Enter new Description:");
        const index = e.target.id;

        if(newPrice !== null && newPrice != ""){
            newPrice = new BigNumber(newPrice).shiftedBy(ERC20_DECIMALS).toString();
           
            try{
                const result = await contract.methods.updateService(index, newPrice, newDescription).send({ from: kit.defaultAccount });
                console.log(`Updated "${skills[index].serviceName}"`);
                getServices();
            } catch(error){
                console.log(error);
            }
    }
}});

addServiceBtn.addEventListener('click', function (){
    addServiceModal.style.display = 'block';
});

closeBtn.addEventListener('click', function(){
    addServiceModal.style.display = 'none';
});

window.addEventListener('click', function(event){
    if (event.target === addServiceModal){
        addServiceModal.style.display ='none';
    }
});

addServiceForm.addEventListener('submit', async function(event){
    event.preventDefault();

    try {
        // Retrieving form values
        const serviceId = document.getElementById('service-id').value;
        const serviceName = document.getElementById('service-name').value;
        const serviceDescription = document.getElementById('service-description').value;
        const servicePrice = new BigNumber(document.getElementById('service-price').value).shiftedBy(ERC20_DECIMALS).toString();

        //Adding contract call to add a service to market place
        await contract.methods.addService(serviceId, serviceName, serviceDescription, servicePrice).send({ from: kit.defaultAccount });

        console.log("Successfully added a new service to the Market Place");

        //Closing the modal and clearing the form
        addServiceModal.style.display = 'none';
        addServiceForm.reset();

        //Refreshing services list
        await getServices();

    } catch(error){
        console.log(error);
    }
});

// async function purchaseService(index){
//     const currentService = skills[index];

//     try{
//         await contract.methods.purchaseService(index).send({ from: kit.defaultAccount });
//         //Reloading services again after purchase
//         getServices();
//     } catch (error){
//         console.log(error);
//     }
// }


// async function updateService(index){
//     const currentService = skills[index];

//     try {
//         // Prompting user for a new price and description
//         const newPrice = prompt("Enter new Price:");
//         const newDescription = prompt("Enter new Description:");

//         if (newPrice !== null && newDescription !== null){
//             await contract.methods.updateService(index, newPrice, newDescription).send({ from: kit.defaultAccount });

//             // Reloading services again
//             getServices();
//         }
//     } catch (error){
//         console.log(error);
//     }
// }

// async function removeService(index){
//     const currentService = skills[index];

//     try{
//         const confirmation = confirm(`Are you sure you want to remove the service "${currentService.serviceName}"?`);
//         if (confirmation){
//             await contract.methods.removeService(index).send({ from: kit.defaultAccount });

//             //Reloading services after removal
//             getServices();
//         }

//     } catch (error){
//         console.log(error);
//     }
// }


window.addEventListener("load", async () =>{
    console.log("Loading the Skill Market Place");
    await connectCeloWallet();
    await getBalance();
    await getServices();
});