// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { YourCollectible } from "../contracts/YourCollectible.sol";

contract YourCollectibleTest is Test {
    YourCollectible public nft;
    address public user1;
    address public user2;

    function setUp() public {
        nft = new YourCollectible();
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
    }

    function test_InitialSetup() public view {
        assertEq(nft.name(), "YourCollectible");
        assertEq(nft.symbol(), "YCB");
        assertEq(nft.tokenIdCounter(), 0);
    }

    function test_MintItem() public {
        string memory uri = "QmfVMAmNM1kDEBYrC2TPzQDoCRFH6F5tE1e9Mr4FkkR5Xr";

        uint256 tokenId = nft.mintItem(user1, uri);

        assertEq(tokenId, 1);
        assertEq(nft.balanceOf(user1), 1);
        assertEq(nft.tokenIdCounter(), 1);
        assertEq(
            nft.tokenURI(tokenId),
            string.concat("https://ipfs.io/ipfs/", uri)
        );
    }

    function test_TokenOfOwnerByIndex() public {
        nft.mintItem(user1, "QmfVMAmNM1kDEBYrC2TPzQDoCRFH6F5tE1e9Mr4FkkR5Xr");

        uint256 token = nft.tokenOfOwnerByIndex(user1, 0);
        assertEq(token, 1);
    }

    function test_Transfer() public {
        nft.mintItem(user1, "QmfVMAmNM1kDEBYrC2TPzQDoCRFH6F5tE1e9Mr4FkkR5Xr");

        vm.prank(user1);
        nft.transferFrom(user1, user2, 1);

        assertEq(nft.balanceOf(user1), 0);
        assertEq(nft.balanceOf(user2), 1);
        assertEq(nft.ownerOf(1), user2);
    }
}
