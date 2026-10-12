import "../assets/css/bottomNavbar.css";
import { useLocale } from "../util/useLocale";

const links = ["waysToBuy", "terms", "faq", "cities", "companies", "blog", "newsletter", "careers", "api"];

const BottomNavbar = () => {
    const { t } = useLocale();
    return (
        <div className='bottom-navbar'>
            <ul>
                {links.map((link) => (
                    <li key={link}><a href="#">{t(`footer.${link}`)}</a></li>
                ))}
            </ul>
        </div>
    )
}

export default BottomNavbar;
