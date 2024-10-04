import { Box } from "@radix-ui/themes";
import Layout from "./components/Layout";
import CreateProposalModal from "./components/CreateProposalModal";
import Proposals from "./components/Proposals";
import useContract from "./hooks/useContract";
import { useCallback, useEffect, useState } from "react";
import { Contract } from "ethers";
import useRunners from "./hooks/useRunners";
import { Interface } from "ethers";
import ABI from "./ABI/proposal.json";
import { toast } from "react-toastify";

const multicallAbi = [
    "function tryAggregate(bool requireSuccess, (address target, bytes callData)[] calls) returns ((bool success, bytes returnData)[] returnData)",
];

function App() {
    
    const readOnlyProposalContract = useContract(true);

    const { readOnlyProvider } = useRunners();
    const [proposals, setProposals] = useState([]);


    const fetchProposals = useCallback(async () => {
        if (!readOnlyProposalContract) return;

        const multicallContract = new Contract(
            import.meta.env.VITE_MULTICALL_ADDRESS,
            multicallAbi,
            readOnlyProvider
        );

        const itf = new Interface(ABI);

        try {
            const proposalCount = Number(
                await readOnlyProposalContract.proposalCount()
            );

            const proposalsIds = Array.from(
                { length: proposalCount - 1 },
                (_, i) => i + 1
            );

            const calls = proposalsIds.map((id) => ({
                target: import.meta.env.VITE_CONTRACT_ADDRESS,
                callData: itf.encodeFunctionData("proposals", [id]),
            }));

            const responses = await multicallContract.tryAggregate.staticCall(
                true,
                calls
            );

            const decodedResults = responses.map((res) =>
                itf.decodeFunctionResult("proposals", res.returnData)
            );

            const data = decodedResults.map((proposalStruct, i) => ({
                proposalId: proposalsIds[i],
                description: proposalStruct.description,
                amount: proposalStruct.amount,
                minRequiredVote: proposalStruct.minVotesToPass,
                votecount: proposalStruct.voteCount,
                deadline: proposalStruct.votingDeadline,
                executed: proposalStruct.executed,
            }));

            setProposals(data);

            console.log(data)
        } catch (error) {
            console.log("error fetching proposals: ", error);
        }
    }, [readOnlyProposalContract, readOnlyProvider]);

    useEffect(() => {

        if (readOnlyProposalContract) {

            const listener = (proposalId, description, amount, minRequiredVote, voteCount, deadline, executed) => {
                setProposals((proposals) => [
                    ...proposals,
                    {
                        proposalId,
                        description,
                        amount,
                        minRequiredVote: BigInt(minRequiredVote),
                        voteCount: BigInt(voteCount),
                        deadline: BigInt(deadline),
                        executed
                    }
                ]);
            };

            readOnlyProposalContract.on("ProposalCreated", listener);

            return () => {
                readOnlyProposalContract.off("ProposalCreated", listener);
            };

        }
    }, []);

    useEffect(() => {

        if (readOnlyProposalContract) {
            // listen to Voted event
            const votedListener = (proposalId) => {
                setProposals((proposals) => {
                    const updatedProposals = proposals.map((proposal) => {
                        if (proposal.proposalId === proposalId) {
                            return {
                                ...proposal,
                                voteCount: proposal.voteCount + 1,
                            };
                        }
                        return proposal;
                    });
                    return updatedProposals;
                });
            };
    
            readOnlyProposalContract.on("Voted", votedListener);
    
    
            return () => {
                readOnlyProposalContract.off("Voted", votedListener);
            };
        }

    }, [])


    useEffect(() => {
        fetchProposals();
    }, [proposals]);


    return (
        <Layout>
            <Box className="flex justify-end p-4">
                <CreateProposalModal />
            </Box>
            <Proposals proposals={proposals} />
        </Layout>
    );
}

export default App;
