function Spinner({ size = "md" }) {
    const sizeClasses = {
        sm: "loading-sm",
        md: "loading-md",
        lg: "loading-lg",
        xl: "loading-xl"
    };

    return (
        <div className={`loading loading-spinner text-primary ${sizeClasses[size]}`}></div>
    );
}

export default Spinner;