import { useAppKitProvider } from "@reown/appkit/react";
import { BrowserProvider } from "ethers";
import { useEffect, useMemo, useState } from "react";
import { jsonRpcProvider } from "../constants/provider";

const useRunners = () => {
    // set signer states
    const [signer, setSigner] = useState();
    // set provider states
    const { walletProvider } = useAppKitProvider("eip155");

    // declare provider as wallet provider if its available else set to null
    const provider = useMemo(
        () => (walletProvider ? new BrowserProvider(walletProvider) : null),
        [walletProvider]
    );

    // set signer if provider changes
    useEffect(() => {
        // if no provider set signer to null
        if (!provider) return setSigner(null);

        // set signer if provider changes as new signer
        provider.getSigner().then((newSigner) => {
            // if no signer setSigner to newsigner
            if (!signer) return setSigner(newSigner);
            if (newSigner === signer) return;
            setSigner(newSigner);
        });
    }, [provider, signer]);
    return { provider, signer, readOnlyProvider: jsonRpcProvider };
};

export default useRunners;
