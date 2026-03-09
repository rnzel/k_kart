import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SuccessModal from "./SuccessModal";

describe("SuccessModal", () => {
    const defaultProps = {
        showModal: true,
        onClose: jest.fn(),
        title: "Test Success",
        message: "This is a test message",
        buttonText: "Test Button"
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should not render when showModal is false", () => {
        render(<SuccessModal {...defaultProps} showModal={false} />);
        expect(screen.queryByText("Test Success")).not.toBeInTheDocument();
    });

    it("should render with correct title and message", () => {
        render(<SuccessModal {...defaultProps} />);
        expect(screen.getByText("Test Success")).toBeInTheDocument();
        expect(screen.getByText("This is a test message")).toBeInTheDocument();
    });

    it("should call onClose when close button is clicked", () => {
        render(<SuccessModal {...defaultProps} />);
        const closeButton = screen.getByRole("button", { name: /close/i });
        fireEvent.click(closeButton);
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should call onButtonClick when button is clicked", () => {
        const onButtonClick = jest.fn();
        render(<SuccessModal {...defaultProps} onButtonClick={onButtonClick} />);
        const button = screen.getByText("Test Button");
        fireEvent.click(button);
        expect(onButtonClick).toHaveBeenCalled();
    });

    it("should call onClose when button is clicked and onButtonClick is not provided", () => {
        render(<SuccessModal {...defaultProps} />);
        const button = screen.getByText("Test Button");
        fireEvent.click(button);
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should show loading spinner when loading is true", () => {
        render(<SuccessModal {...defaultProps} loading={true} />);
        expect(screen.getByRole("status")).toBeInTheDocument();
        expect(screen.getByText("Processing...")).toBeInTheDocument();
    });

    it("should disable buttons when loading is true", () => {
        render(<SuccessModal {...defaultProps} loading={true} />);
        const button = screen.getByText("Test Button");
        const closeButton = screen.getByRole("button", { name: /close/i });
        expect(button).toBeDisabled();
        expect(closeButton).toBeDisabled();
    });

    it("should not show close button when showCloseButton is false", () => {
        render(<SuccessModal {...defaultProps} showCloseButton={false} />);
        expect(screen.queryByRole("button", { name: /close/i })).not.toBeInTheDocument();
    });
});