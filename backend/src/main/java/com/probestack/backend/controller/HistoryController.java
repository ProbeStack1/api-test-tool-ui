package com.probestack.backend.controller;

import com.probestack.backend.model.HistoryItem;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class HistoryController {

    // Thread-safe in-memory storage
    private final List<HistoryItem> historyStore = new CopyOnWriteArrayList<>();

    public HistoryController() {
        // Mock Data
        historyStore.add(new HistoryItem("https://api.spacexdata.com/v4/launches/latest", "GET", 200, 1024, 156, false, java.time.Instant.now().toString()));
    }

    @GetMapping("/history")
    public List<HistoryItem> getHistory() {
        return historyStore;
    }

    @PostMapping("/history")
    public HistoryItem addHistory(@RequestBody HistoryItem item) {
        // Add to front (pseudo) - actually List adds to end, we can reverse on GET or insert at 0
        ((CopyOnWriteArrayList<HistoryItem>) historyStore).add(0, item);
        
        // Limit
        if (historyStore.size() > 50) {
            historyStore.remove(historyStore.size() - 1);
        }
        return item;
    }

    @DeleteMapping("/history")
    public String clearHistory() {
        historyStore.clear();
        return "Cleared";
    }

    @GetMapping("/stats")
    public Map<String, Object> getStats() {
        int total = historyStore.size();
        long success = historyStore.stream().filter(h -> h.getStatus() >= 200 && h.getStatus() < 300).count();
        long errors = historyStore.stream().filter(h -> h.isError() || h.getStatus() >= 400).count();

        // Trends (Last 10)
        List<Map<String, Object>> trends = historyStore.stream()
                .limit(10)
                .map(h -> {
                    Map<String, Object> map = new HashMap<>();
                    // Simple parsing for demo (assuming ISO format)
                    String timeLabel = h.getDate().contains("T") 
                        ? h.getDate().split("T")[1].substring(0, 5) 
                        : "Now";
                    map.put("name", timeLabel);
                    map.put("time", h.getTime());
                    return map;
                })
                // Reverse to show oldest to newest left-to-right (if we took top 10 most recent)
                // Actually if we want time chart, we want chronological.
                // Our list has newest first. So stream limit 10 gives newest.
                // We need to reverse that list for the chart.
                .collect(Collectors.toList());
        
        Collections.reverse(trends);

        Map<String, Object> response = new HashMap<>();
        response.put("total", total);
        response.put("successRate", total > 0 ? Math.round(((double) success / total) * 100) : 0);
        response.put("errorRate", total > 0 ? Math.round(((double) errors / total) * 100) : 0);
        response.put("trends", trends);
        
        return response;
    }
}
