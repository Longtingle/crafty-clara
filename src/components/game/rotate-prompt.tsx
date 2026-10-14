// Covers the table on a phone held upright: the hand and melds need the width.
function RotatePrompt() {
    return (
        <div className="fixed inset-0 z-40 hidden flex-col items-center justify-center gap-7 bg-felt p-8 text-center [@media(orientation:portrait)_and_(max-width:640px)]:flex">
            <span className="font-heading text-3xl font-extrabold">Crafty Clara</span>
            <svg width="168" height="150" viewBox="0 0 168 150" fill="none" role="img" aria-label="A phone turning from portrait to landscape">
                <rect x="22" y="10" width="46" height="80" rx="9" stroke="#bfd3c6" strokeWidth="3" />
                <path d="M39 20h12" stroke="#bfd3c6" strokeWidth="3" strokeLinecap="round" />
                <rect x="58" y="82" width="98" height="56" rx="9" stroke="#f5b83d" strokeWidth="3" strokeDasharray="7 6" />
                <path d="M84 26c30 0 52 18 56 44" stroke="#f5b83d" strokeWidth="3" strokeLinecap="round" />
                <path d="m131 62 9 9 8-11" stroke="#f5b83d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="flex flex-col gap-2.5">
                <h2 className="font-heading text-2xl font-bold">Turn your phone sideways</h2>
                <p className="leading-relaxed text-muted-foreground">The table needs the width to fit your hand, the piles and everyone's melds.</p>
            </div>
        </div>
    );
}

export default RotatePrompt;
