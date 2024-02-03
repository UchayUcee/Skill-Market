// SPDX-License-Identifier: MIT

/// @dev solitity version.
pragma solidity >=0.7.0 <0.9.0; //this contract works for solidty version from 0.7.0 to less than 0.9.0

/**
 * @dev Required interface of an ERC20 compliant contract.
 */
interface IERC20Token {
    function transfer(address, uint256) external returns (bool);

    /**
     * @dev Gives permission to `to` to transfer `tokenId` token to another account.
     * The approval is cleared when the token is transferred.
     *
     * Only a single account can be approved at a time, so approving the zero address clears previous approvals.
     *
     * Requirements:
     *
     * - The caller must own the token or be an approved operator.
     * - `tokenId` must exist.
     *
     * Emits an {Approval} event.
     */
    function approve(address, uint256) external returns (bool);

    /**
     * @dev Transfers `tokenId` token from `from` to `to`
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must exist and be owned by `from`.
     * - If the caller is not `from`, it must be approved to move this token by either {approve} or {setApprovalForAll}.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(
        address,
        address,
        uint256
    ) external returns (bool);

    function totalSupply() external view returns (uint256);

    /**
     *@dev Returns the number of tokens in``owner``'s acount.
     */
    function balanceOf(address) external view returns (uint256);

    function allowance(address, address) external view returns (uint256);

    /**
     *@dev Emitted when `tokenId` token is transferred from `from` to `to`.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     *@dev Emitted when `owner` enables `approved` to manage the `tokenId` token.
     */
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}
contract SkillMarket {
    uint private numberOfServicesAvailable = 0;
    address internal cUsdTokenAddress = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;


    struct Service {
        address payable provider;
        string serviceId;
        string serviceName;
        string serviceDescription;
        uint servicePrice;
        uint serviceReputation;
        uint totalNumberOfClients;
    }

    mapping(string => bool) private serviceIdentifier;
    mapping(uint => Service) private services;

    mapping(uint => bool) private exists;

    modifier onlyServiceProvider(uint _index){
        require(services[_index].provider == msg.sender, "Are you service provider :)");
        _;
    }

    modifier exist(uint _index){
        require(exists[_index], "Service does not exist");
        _;
    }


    function addService(
        string calldata _serviceId,
        string calldata _serviceName,
        string calldata _serviceDescription,
        uint _servicePrice
    ) public {
        require(bytes(_serviceName).length > 0, "Service Name should not be empty");
        require(bytes(_serviceDescription).length > 0, "Service Description should not be empty");
        //require(!serviceIdentifier[_serviceId], "A service with this ID already exists");

        services[numberOfServicesAvailable] = Service(
            payable(msg.sender),
            _serviceId,
            _serviceName,
            _serviceDescription,
            _servicePrice,
            0, //service reputation
            0 //total number of clients
        );
        serviceIdentifier[_serviceId] = true;
        exists[numberOfServicesAvailable] = true;
        numberOfServicesAvailable++;

    }

    function viewService(uint _index) public view exist(_index) returns (Service memory){
        return (services[_index]);
    }

    function purchaseService(uint _index) external payable exist(_index) {
        //Service storage selectedService = services[_index];
        require(services[_index].provider != msg.sender, "You cannot purchase your own services");
        //require(msg.value >= selectedService.servicePrice, "Insufficient funds");
        require(IERC20Token(cUsdTokenAddress).transferFrom(msg.sender, services[_index].provider, services[_index].servicePrice), "Transfer unsuccessful");
        services[_index].totalNumberOfClients++;
        services[_index].serviceReputation += 2;
    }


    function viewReputation(uint _index) public view exist(_index) returns(uint) {
        return (services[_index].serviceReputation);
    }

    function viewNumberOfServicesAvailable() public view returns(uint){
        return (numberOfServicesAvailable);
    }

    function removeService(uint _index) public exist(_index) onlyServiceProvider(_index) {
        serviceIdentifier[services[_index].serviceId] = false;
        delete services[_index];
        exists[_index] = false;
        numberOfServicesAvailable--;
    }

    function updateService(uint _index, uint _price, string calldata _description) public exist(_index) onlyServiceProvider(_index) {
        Service storage currentService = services[_index];
        currentService.servicePrice = _price;
        currentService.serviceDescription = _description;

    }   
}