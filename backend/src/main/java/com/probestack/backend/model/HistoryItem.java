package com.probestack.backend.model;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class HistoryItem {
    private String url;
    private String method;
    private int status;
    private int size;
    private long time;
    private boolean error;
    private String date;
}
