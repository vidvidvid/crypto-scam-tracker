import { VStack, Text, Button } from "@chakra-ui/react";
import { useWeb3AuthContext } from "../contexts/Web3AuthContext";
import { useSiteRatings } from "../contexts/SiteRatingsContext";
import SiteRating from "./SiteRating";
import CommentsSection from "./CommentsSection";

function MainContent() {
  const { userData, ethAddress, logout } = useWeb3AuthContext();
  const { currentUrl, isValidUrl } = useSiteRatings();

  return (
    <VStack spacing={4} align='stretch'>
      <Text>Logged in as: {userData?.email || ethAddress}</Text>
      <Text>Current URL: {currentUrl}</Text>
      {isValidUrl ? (
        <>
          <SiteRating />
          <CommentsSection />
        </>
      ) : (
        <Text>Cannot rate this type of URL</Text>
      )}
      <Button onClick={logout}>Logout</Button>
    </VStack>
  );
}

export default MainContent;
