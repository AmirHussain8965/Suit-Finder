import bgTuxedo from "../assets/images/bg-tuxedo.jpg";
import bgDoubleBreasted from "../assets/images/bg-gallery-suits.png";
import bgThreePiece from "../assets/images/bg-profile-suit.png";

interface SuitedSilhouettesProps {
  variant?: "tuxedo" | "double-breasted" | "three-piece";
}

const backgrounds = {
  "tuxedo": bgTuxedo,
  "double-breasted": bgDoubleBreasted,
  "three-piece": bgThreePiece,
};

export function SuitedSilhouettes({ variant = "tuxedo" }: SuitedSilhouettesProps) {
  const bgImage = backgrounds[variant];
  
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.15] dark:opacity-[0.20]"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background opacity-80" />
    </div>
  );
}
