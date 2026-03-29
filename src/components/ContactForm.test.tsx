import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

async function renderContactForm() {
  vi.resetModules();
  const { ContactForm } = await import("./ContactForm");
  render(<ContactForm contactEmail="contact@blfsc.com" />);
}

describe("ContactForm", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows validation errors for empty submit", async () => {
    await renderContactForm();

    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(screen.getByText("Please enter your name.")).toBeInTheDocument();
    expect(screen.getByText("Please enter your email.")).toBeInTheDocument();
    expect(screen.getByText("Please add a subject.")).toBeInTheDocument();
    expect(screen.getByText("Please choose a topic.")).toBeInTheDocument();
    expect(screen.getByText("Please write your message.")).toBeInTheDocument();
  });

  it("submits a valid message without turnstile", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));

    await renderContactForm();

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Tester" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "tester@example.com" } });
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Help needed" } });
    fireEvent.change(screen.getByLabelText("Topic"), { target: { value: "General enquiry" } });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "This is a detailed message with enough content." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/contact",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const [, requestInit] = fetchSpy.mock.calls[0];
    expect(JSON.parse(String(requestInit?.body || "{}"))).toEqual({
      name: "Tester",
      email: "tester@example.com",
      subject: "Help needed",
      topic: "General enquiry",
      message: "This is a detailed message with enough content.",
    });

    expect(await screen.findByText("Thanks, your enquiry has been received.")).toBeInTheDocument();
  });
});
