// Fix: Export the Step interface to make this file a module.
export interface StepHighlight {
    top: number;
    left: number;
    width: number;
    height: number;
    tagName?: string;
}

export interface Step {
    id: number;
    description: string;
    screenshot: string;
    highlight?: StepHighlight;
}
