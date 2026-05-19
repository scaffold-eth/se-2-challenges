// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract PredictionMarketToken is ERC20 {
    error PredictionMarketToken__OnlyPredictionMarketCanMint();
    error PredictionMarketToken__OnlyPredictionMarketCanBurn();
    error PredictionMarketToken__LiquidityProviderCantTransfer();

    address public predictionMarket;
    address public liquidityProvider;

    constructor(
        string memory name,
        string memory symbol,
        address _liquidityProvider,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        predictionMarket = msg.sender;
        liquidityProvider = _liquidityProvider;
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) external {
        if (msg.sender != predictionMarket) {
            revert PredictionMarketToken__OnlyPredictionMarketCanMint();
        }
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        if (msg.sender != predictionMarket) {
            revert PredictionMarketToken__OnlyPredictionMarketCanBurn();
        }
        _burn(from, amount);
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        if (msg.sender == liquidityProvider) {
            revert PredictionMarketToken__LiquidityProviderCantTransfer();
        }
        return super.transfer(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        if (from == liquidityProvider) {
            revert PredictionMarketToken__LiquidityProviderCantTransfer();
        }
        return super.transferFrom(from, to, amount);
    }
}
