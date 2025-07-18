export const preContent = `import { PhotoIcon, ArrowPathIcon, ArrowUpTrayIcon, ArrowDownTrayIcon} from "@heroicons/react/24/outline";`;

export const extraMenuLinksObjects = [
  {
    label: "My NFTs",
    href: "/myNFTs",
    icon: '$$<PhotoIcon className="h-4 w-4" />$$',
  },
  {
    label: "Transfers",
    href: "/transfers",
    icon: '$$<ArrowPathIcon className="h-4 w-4" />$$',
  },
  {
    label: "IPFS Upload",
    href: "/ipfsUpload",
    icon: '$$<ArrowUpTrayIcon className="h-4 w-4" />$$',
  },
  {
    label: "IPFS Download",
    href: "/ipfsDownload",
    icon: '$$<ArrowDownTrayIcon className="h-4 w-4" />$$',
  },
];

export const logoTitle = "SRE Challenges";
export const logoSubtitle = "Simple NFT";
