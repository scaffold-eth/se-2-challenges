// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

library StatisticsUtils {
    /////////////////
    /// Errors //////
    /////////////////

    error EmptyArray();

    ///////////////////
    /// Functions /////
    ///////////////////

    /**
     * @notice Sorts an array of uint256 values in ascending order using selection sort
     * @dev Uses selection sort algorithm which is not gas-efficient but acceptable for small arrays.
     *      This implementation mimics the early MakerDAO Medianizer exactly.
     *      Modifies the input array in-place.
     * @param arr The array of uint256 values to sort in ascending order
     */
    function sort(uint256[] memory arr) internal pure {
        uint256 n = arr.length;
        for (uint256 i = 0; i < n; i++) {
            uint256 minIndex = i;
            for (uint256 j = i + 1; j < n; j++) {
                if (arr[j] < arr[minIndex]) {
                    minIndex = j;
                }
            }
            if (minIndex != i) {
                (arr[i], arr[minIndex]) = (arr[minIndex], arr[i]);
            }
        }
    }

    /**
     * @notice Calculates the median value from a sorted array of uint256 values
     * @dev For arrays with even length, returns the average of the two middle elements.
     *      For arrays with odd length, returns the middle element.
     *      Assumes the input array is already sorted in ascending order.
     * @param arr The sorted array of uint256 values to calculate median from
     * @return The median value as a uint256
     */
    function getMedian(uint256[] memory arr) internal pure returns (uint256) {
        uint256 length = arr.length;
        if (length == 0) revert EmptyArray();
        if (length % 2 == 0) {
            return (arr[length / 2 - 1] + arr[length / 2]) / 2;
        } else {
            return arr[length / 2];
        }
    }
}
