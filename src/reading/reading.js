// ============================================
// READING ORDER & TRANSCRIPTION
// Manage glyph sequence, word/line/column breaks
// ============================================

const ReadingOrder = {
    // Supported reading directions
    DIRECTIONS: {
        RTL: 'rtl',           // Right-to-left (most common for Hakli)
        LTR: 'ltr',           // Left-to-right
        TTB_RTL: 'ttb-rtl',   // Top-to-bottom, columns right-to-left
        TTB_LTR: 'ttb-ltr',   // Top-to-bottom, columns left-to-right
        BOUSTROPHEDON: 'boustrophedon'  // Alternating direction
    },

    /**
     * Auto-detect reading direction based on glyph positions
     * Analyzes spatial distribution to suggest most likely direction
     */
    detectDirection: (detections) => {
        if (!detections || detections.length < 2) {
            return ReadingOrder.DIRECTIONS.RTL; // Default for Hakli
        }

        // Calculate centroid positions
        const positions = detections.map(d => ({
            x: d.position.x + d.position.width / 2,
            y: d.position.y + d.position.height / 2
        }));

        // Analyze horizontal vs vertical spread
        const xValues = positions.map(p => p.x);
        const yValues = positions.map(p => p.y);
        
        const xSpread = Math.max(...xValues) - Math.min(...xValues);
        const ySpread = Math.max(...yValues) - Math.min(...yValues);

        // If vertical spread dominates, likely columnar
        if (ySpread > xSpread * 1.5) {
            return ReadingOrder.DIRECTIONS.TTB_RTL;
        }

        // Default to RTL for horizontal inscriptions
        return ReadingOrder.DIRECTIONS.RTL;
    },

    /**
     * Generate automatic reading order based on direction
     * Returns array of detection indices in reading sequence
     */
    generateOrder: (detections, direction = 'rtl') => {
        if (!detections || detections.length === 0) return [];

        // Create indexed copy with centroids
        const indexed = detections.map((d, i) => ({
            index: i,
            x: d.position.x + d.position.width / 2,
            y: d.position.y + d.position.height / 2,
            width: d.position.width,
            height: d.position.height
        }));

        // Group into lines/columns based on direction
        const lineThreshold = ReadingOrder._calculateLineThreshold(indexed);
        
        switch (direction) {
            case ReadingOrder.DIRECTIONS.RTL:
                return ReadingOrder._orderRTL(indexed, lineThreshold);
            case ReadingOrder.DIRECTIONS.LTR:
                return ReadingOrder._orderLTR(indexed, lineThreshold);
            case ReadingOrder.DIRECTIONS.TTB_RTL:
                return ReadingOrder._orderTTB(indexed, lineThreshold, true);
            case ReadingOrder.DIRECTIONS.TTB_LTR:
                return ReadingOrder._orderTTB(indexed, lineThreshold, false);
            case ReadingOrder.DIRECTIONS.BOUSTROPHEDON:
                return ReadingOrder._orderBoustrophedon(indexed, lineThreshold);
            default:
                return ReadingOrder._orderRTL(indexed, lineThreshold);
        }
    },

    /**
     * Calculate threshold for grouping glyphs into lines
     */
    _calculateLineThreshold: (indexed) => {
        if (indexed.length < 2) return 50;
        
        // Use median height as baseline
        const heights = indexed.map(g => g.height).sort((a, b) => a - b);
        const medianHeight = heights[Math.floor(heights.length / 2)];
        
        return medianHeight * 0.6; // Glyphs within 60% of median height are same line
    },

    /**
     * Order glyphs right-to-left, top-to-bottom
     */
    _orderRTL: (indexed, lineThreshold) => {
        // Sort by Y first (top to bottom), then X descending (right to left)
        const sorted = [...indexed].sort((a, b) => {
            const yDiff = a.y - b.y;
            if (Math.abs(yDiff) > lineThreshold) return yDiff;
            return b.x - a.x; // Right to left within same line
        });
        return sorted.map(g => g.index);
    },

    /**
     * Order glyphs left-to-right, top-to-bottom
     */
    _orderLTR: (indexed, lineThreshold) => {
        const sorted = [...indexed].sort((a, b) => {
            const yDiff = a.y - b.y;
            if (Math.abs(yDiff) > lineThreshold) return yDiff;
            return a.x - b.x; // Left to right within same line
        });
        return sorted.map(g => g.index);
    },

    /**
     * Order glyphs top-to-bottom in columns
     */
    _orderTTB: (indexed, lineThreshold, rtlColumns) => {
        // Group into columns first
        const columnThreshold = lineThreshold * 1.2;
        const sorted = [...indexed].sort((a, b) => {
            const xDiff = rtlColumns ? (b.x - a.x) : (a.x - b.x);
            if (Math.abs(a.x - b.x) > columnThreshold) return xDiff;
            return a.y - b.y; // Top to bottom within column
        });
        return sorted.map(g => g.index);
    },

    /**
     * Order glyphs in alternating boustrophedon pattern
     */
    _orderBoustrophedon: (indexed, lineThreshold) => {
        // Group into lines
        const lines = ReadingOrder._groupIntoLines(indexed, lineThreshold);
        
        // Alternate direction for each line
        const result = [];
        lines.forEach((line, lineIndex) => {
            const sorted = lineIndex % 2 === 0
                ? line.sort((a, b) => b.x - a.x)  // RTL for even lines
                : line.sort((a, b) => a.x - b.x); // LTR for odd lines
            result.push(...sorted.map(g => g.index));
        });
        
        return result;
    },

    /**
     * Group glyphs into lines based on Y position
     */
    _groupIntoLines: (indexed, threshold) => {
        const sorted = [...indexed].sort((a, b) => a.y - b.y);
        const lines = [];
        let currentLine = [sorted[0]];
        
        for (let i = 1; i < sorted.length; i++) {
            const prevY = currentLine[currentLine.length - 1].y;
            if (Math.abs(sorted[i].y - prevY) > threshold) {
                lines.push(currentLine);
                currentLine = [sorted[i]];
            } else {
                currentLine.push(sorted[i]);
            }
        }
        lines.push(currentLine);
        
        return lines;
    },

    /**
     * Move glyph in reading order
     */
    moveGlyph: (readingOrder, fromIndex, toIndex) => {
        const order = [...readingOrder];
        const [moved] = order.splice(fromIndex, 1);
        order.splice(toIndex, 0, moved);
        return order;
    },

    /**
     * Toggle word boundary after a glyph
     */
    toggleWordBoundary: (wordBoundaries, afterIndex) => {
        const boundaries = new Set(wordBoundaries);
        if (boundaries.has(afterIndex)) {
            boundaries.delete(afterIndex);
        } else {
            boundaries.add(afterIndex);
        }
        return boundaries;
    },

    /**
     * Toggle line break after a glyph
     */
    toggleLineBreak: (lineBreaks, afterIndex) => {
        const breaks = new Set(lineBreaks);
        if (breaks.has(afterIndex)) {
            breaks.delete(afterIndex);
        } else {
            breaks.add(afterIndex);
        }
        return breaks;
    },

    /**
     * Toggle column break after a glyph
     */
    toggleColumnBreak: (columnBreaks, afterIndex) => {
        const breaks = new Set(columnBreaks);
        if (breaks.has(afterIndex)) {
            breaks.delete(afterIndex);
        } else {
            breaks.add(afterIndex);
        }
        return breaks;
    }
};

// Make globally available
window.ReadingOrder = ReadingOrder;
