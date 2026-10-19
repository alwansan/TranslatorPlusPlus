package com.translatorplusplus.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.translatorplusplus.model.GameEngine
import com.translatorplusplus.model.RowStatus
import com.translatorplusplus.model.RowTag
import com.translatorplusplus.ui.theme.*

@Composable
fun EngineBadge(engine: GameEngine, modifier: Modifier = Modifier) {
    Surface(
        color = engine.badgeColor.copy(alpha = 0.18f),
        contentColor = engine.badgeColor,
        shape = RoundedCornerShape(6.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, engine.badgeColor.copy(alpha = 0.4f)),
        modifier = modifier
    ) {
        Text(
            text = engine.displayName,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
        )
    }
}

@Composable
fun StatusBadge(status: RowStatus, modifier: Modifier = Modifier) {
    Surface(
        color = status.color.copy(alpha = 0.2f),
        contentColor = status.color,
        shape = RoundedCornerShape(12.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, status.color.copy(alpha = 0.5f)),
        modifier = modifier
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .clip(CircleShape)
                    .background(status.color)
            )
            Spacer(modifier = Modifier.width(5.dp))
            Text(
                text = status.label,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
fun TagDot(tag: RowTag, size: Int = 10, modifier: Modifier = Modifier) {
    if (tag != RowTag.NONE) {
        Box(
            modifier = modifier
                .size(size.dp)
                .clip(CircleShape)
                .background(tag.color)
                .border(1.dp, Color.White.copy(alpha = 0.6f), CircleShape)
        )
    }
}

@Composable
fun HighlightedGameText(
    text: String,
    modifier: Modifier = Modifier,
    textColor: Color = MaterialTheme.colorScheme.onSurface
) {
    // Regex for codes: \c[n], \v[n], \n, [var], {tag}, <tag>
    val tokenRegex = Regex("""(\\[cCvViIgG]\[\d+]|\\[nN]|\\[\.\!\|\^\<\>\{\}\$]|\[[a-zA-Z0-9_\.]+\]|\{[a-zA-Z0-9_=#]+}|\{/[a-zA-Z0-9_]+}|<[/]?[a-zA-Z0-9_]+(?:=[^>]+)?>)""")

    val annotated = buildAnnotatedString {
        var lastIdx = 0
        tokenRegex.findAll(text).forEach { match ->
            if (match.range.first > lastIdx) {
                withStyle(SpanStyle(color = textColor)) {
                    append(text.substring(lastIdx, match.range.first))
                }
            }
            // Code token styling
            withStyle(
                SpanStyle(
                    color = AccentAmber,
                    background = AccentAmber.copy(alpha = 0.15f),
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold
                )
            ) {
                append(match.value)
            }
            lastIdx = match.range.last + 1
        }
        if (lastIdx < text.length) {
            withStyle(SpanStyle(color = textColor)) {
                append(text.substring(lastIdx))
            }
        }
    }

    Text(
        text = annotated,
        style = MaterialTheme.typography.bodyMedium,
        modifier = modifier
    )
}
