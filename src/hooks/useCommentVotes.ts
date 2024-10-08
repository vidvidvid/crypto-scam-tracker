import { useState, useCallback } from "react";
import { useAttestations } from "./useAttestations";
import { useWeb3AuthContext } from "../contexts/Web3AuthContext";
import { useToast } from "@chakra-ui/react";

export function useCommentVotes() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { createAttestation, getAttestations } = useAttestations();
  const { ethAddress } = useWeb3AuthContext();
  const toast = useToast();

  const VOTE_SCHEMA_ID = import.meta.env.VITE_ATTESTATION_VOTE_ID;

  const getVotesForComments = useCallback(
    async (commentIds: string[]) => {
      if (!VOTE_SCHEMA_ID) {
        console.log("VOTE_SCHEMA_ID is not defined");
        return {};
      }
      setLoading(true);
      setError(null);
      try {
        const voteMap: Record<
          string,
          { upvotes: number; downvotes: number; userVote: number | null }
        > = {};

        for (const commentId of commentIds) {
          const voteAttestations = await getAttestations(
            VOTE_SCHEMA_ID,
            commentId
          );

          // Group attestations by user
          const userVotes = voteAttestations.reduce((acc, attestation) => {
            const attester = attestation.attester.toLowerCase();
            if (
              !acc[attester] ||
              new Date(attestation.attestTimestamp) >
                new Date(acc[attester].attestTimestamp)
            ) {
              acc[attester] = attestation;
            }
            return acc;
          }, {} as Record<string, any>);

          let upvotes = 0;
          let downvotes = 0;
          let userVote = null;

          Object.values(userVotes).forEach((attestation: any) => {
            const voteValue = attestation.decodedData.vote;

            if (voteValue === 1) upvotes++;
            else if (voteValue === -1) downvotes++;

            if (
              attestation.attester.toLowerCase() === ethAddress?.toLowerCase()
            ) {
              userVote = voteValue;
            }
          });
          voteMap[commentId] = { upvotes, downvotes, userVote };
        }

        return voteMap;
      } catch (err) {
        console.error("Error fetching votes:", err);
        setError("Failed to fetch votes");
        return {};
      } finally {
        setLoading(false);
      }
    },
    [VOTE_SCHEMA_ID, getAttestations, ethAddress]
  );

  const voteOnComment = async (commentId: string, isUpvote: boolean) => {
    if (!VOTE_SCHEMA_ID || !commentId || !ethAddress) {
      toast({
        title: "Error",
        description: "Cannot vote: missing data",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const result = await createAttestation(VOTE_SCHEMA_ID, commentId, {
        commentId,
        vote: isUpvote ? 1 : -1,
      });

      toast({
        title: "Success",
        description: "Vote recorded successfully!",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error voting on comment:", error);
      toast({
        title: "Error",
        description: `Failed to vote: ${(error as Error).message}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return { getVotesForComments, voteOnComment, loading, error };
}
