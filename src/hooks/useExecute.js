import { useCallback } from "react";
import { toast } from "react-toastify";
import useContract from "./useContract";
import { useAppKitAccount } from "@reown/appkit/react";
import { useAppKitNetwork } from "@reown/appkit/react";
import { liskSepoliaNetwork } from "../connection";

const useExecute = () => {
    const contract = useContract(true);
    const { address } = useAppKitAccount();
    const { chainId } = useAppKitNetwork();
    
    return useCallback(
        async (proposalId) => {
            
            if (!address) {
                toast.error("Connect your wallet!");
                return;
            }
            if (Number(chainId) !== liskSepoliaNetwork.chainId) {
                toast.error("You are not connected to the right network");
                return;
            }

            if (!contract) {
                toast.error("Cannot get contract!");
                return;
            }

            try {
                const estimatedGas = await contract.executeProposal.estimateGas(
                    proposalId
                );
                const tx = await contract.executeProposal(
                    proposalId,
                    {
                        gasLimit: (estimatedGas * BigInt(120)) / BigInt(100),
                    }
                );
                const reciept = await tx.wait();

                if (reciept.status === 1) {
                    toast.success("Executed successfully");
                    return;
                }
                toast.error("Failed to Execute");
                return;
            } catch (error) {
                console.error("error while executing: ", error);
                toast.error("Execution error");
            }
        },
        [address, chainId, contract]
    );
};

export default useExecute;
