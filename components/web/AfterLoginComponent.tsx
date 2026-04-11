import { User } from "better-auth";
import ProfileCard from "../ProfileCard";
import { signOut } from "@/lib/actions/auth-actions";
import { Button } from "../ui/button";

type AfterLoginProps = {
  user: User;
};

export default function AfterLoginComponent({ user }: AfterLoginProps) {
  return (
    <div>
      <form className="mb-1 text-center" action={signOut}>
        <Button type="submit" variant="destructive" className="cursor-pointer">
          Sign Out
        </Button>
      </form>
      <ProfileCard
        name={user.name}
        title="User"
        handle={user.name.replace(/\s/g, "")}
        status="Online"
        contactText="Contact Me"
        avatarUrl="/images/authorized.png"
        showUserInfo={false}
        enableTilt={true}
        enableMobileTilt={true}
        onContactClick={() => console.log("Contact clicked")}
        behindGlowColor="rgba(125, 190, 255, 0.67)"
        iconUrl="/images/iconpattern.png"
        behindGlowEnabled={true}
        innerGradient="linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)"
      />
    </div>
  );
}
